/*
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/**********
** SETUP **
**********/
var cy = null, nodeCount = 0;
var inSelectMode = false, selectedElement = null;
$(document).ready(function() {
	InitCytoscape();
	InitTopMenu();
	InitNodeOptions();
});
function InitTopMenu() {	
	$("#newGraph").on("click", function() { if(confirm("Any unsaved changes will be lost. Continue?")) { cy.load(); } });
	$("#loadJSON").on("click", function() { CleanUpMenu(); $("#loadFileDiv").show(); });
	$("#saveJSON").on("click", function() { SaveJSON(); });
	$("#saveXML").on("click", function() { SaveXML(); });
	$("#refreshLayout").on("click", function() { cy.layout({name: "dagre"}); });
}
function InitNodeOptions() {
	$("#addNode").on("click", function() { CleanUpMenu(); CreateNode(true); });
	$("#addSingle").on("click", function() { SetNextToSingle(); });
	$("#addOptions").on("click", function() { SetNextToOptions(); });
	$("#addConditional").on("click", function() { SetNextToConditional(); });
	
	$("#saveNode").on("click", function() { SaveNode(GetNodeID()); });
	$(document).on("keydown", ".saveable", function() { $("#saveNode").removeAttr("disabled").html("Save"); });
	$(document).on("click", ".removeOption", function() {
		if($(".editOption").length == 2) { alert("You must have at least 2 options for a choice field."); return; }
		$(this).closest(".editOption").remove();
		$("#saveNode").removeAttr("disabled").html("Save");
	});
	$(document).on("click", ".removeCondition", function() {
		if($(".editCondition").length == 2) { alert("You must have at least 2 options for a condition field."); return; }
		$(this).closest(".editCondition").remove();
		$("#saveNode").removeAttr("disabled").html("Save");
	});
	$("#addAdditionalOption").on("click", function() { CreateOptionForCurrentNode(); });
	$("#addAdditionalCondition").on("click", function() { CreateConditionForCurrentNode(); });
	$(document).on("click", ".setTargetToNew", function() {
		$(this).closest(".input-group").find(".optionsTarget").val("*new*");
		$("#saveNode").removeAttr("disabled").html("Save");
	});
	$(document).on("click", ".selectNodeToLink", function() {
		inSelectMode = true;
		selectedElement = $(this).closest(".input-group").find(".optionsTarget");
		$("#cy").addClass("selecting");
		$("#notification").show();
	});
	$("#resetNext").on("click", function() { ResetNext(); });
	$("#deleteNode").on("click", function() { DeleteNode(); });
	$(".randomCondition").on("click", function() { ToggleRandomCondition($(this).hasClass("active")); });
}
function ToggleRandomCondition(turnOff) {
	if(turnOff) {
		$(".randomCondition").removeClass("active");
		$(".conditionLabel").html("Condition");
		$("#fullCondition").val("").removeAttr("disabled");
	} else {
		$(".randomCondition").addClass("active");
		$(".conditionLabel").html("Weight");
		$("#fullCondition").val("random").attr("disabled", "disabled");
	}
}
function InitCytoscape(elems) {
	var padding = 5;
	cy = cytoscape({
		container: $("#cy").get(0),
		boxSelectionEnabled: false,
		layout: {name: "dagre"},
		style: [
			{
				selector: "node",
				style: {
					shape: "roundrectangle",
					content: "data(msg)",
					width: "label",
					height: "label",
					"text-valign": "center",
					"padding-left": padding,
					"padding-right": padding,
					"padding-top": padding,
					"padding-bottom": padding,
					"text-wrap": "wrap",
					"text-max-width": 300
				}
			},
			{
				selector: "edge",
				style: {
					width: 4, 
					"target-arrow-shape": "triangle"
				}
			},
			{
				selector: "node:selected",
				style: {
					"border-width":"6px",
					"border-color":"#AAD8FF",
					"border-opacity":"0.5",
					"background-color":"#77828C",
					"text-outline-color":"#77828C"
				}
			},
			{ selector: ".noop", style: { "font-style": "italic" } }, 
			{ selector: ".speaker", style: { "text-valign": "top" } }, 
			{ selector: ".choice", style: { "text-valign": "top", "background-color": "#AAAAAA" } }, 
			{ selector: ".choiceoption", style: { "background-color": "#888888" } }, 
			{ selector: ".prereq", style: { "label": "data(prereq)" } }
		],
		elements: elems
	});
	cy.on("tap", "node", function() { 
		if(inSelectMode) {
			inSelectMode = false;
			selectedElement.val(this.data("id"));
			$("#cy").removeClass("selecting");
			$("#notification").hide();
			$("#saveNode").removeAttr("disabled").html("Save");
		} else {
			CleanUpMenu();
			EditNode(this);
		}
		return false;
	});
}
function GetNodeID() { return $("#oldID").val(); }
function GetChildLinks(node) { return node.neighborhood("edge[source='" + node.data("id") + "']"); }
function StringOrUndefined(s) { if(s==="") { return undefined; } return s; }

/***********************
** JSON Import/Export **
***********************/
function LoadFile() {
	nodes = {};
	var input, file, fr;
	if (typeof window.FileReader !== 'function') { alert("The file API isn't supported on this browser."); return; }
	input = document.getElementById('fileinput');
	if (!input.files) { alert("This browser doesn't seem to support the `files` property of file inputs."); return; }
	if (!input.files[0]) { alert("Please select a file before clicking 'Load'"); return; }
	file = input.files[0];
	fr = new FileReader();
	fr.onload = function(e) { lines = e.target.result; DisplayFromFile(JSON.parse(lines)); };
	fr.readAsText(file);
}
function DisplayFromFile(data) { // data is JSON, ID cannot be a decimal number
	var nodesJSON = data.nodes;
	var elems = {nodes: [], edges: []};
	nodesJSON.forEach(function(node) {
		var newNode = null;
		if(node.data !== undefined) {
			newNode = GetRegularNode(node.id, node.data);
		} else {
			newNode = {data: {id: node.id, msg: "empty"}, classes: "noop"};
		}
		if(node.next !== undefined) {
			if(node.next instanceof Object) {
				if(node.next.type === "options") { // user choice
					AddOptions(elems, node.id, node.next.data);
				} else if(node.next.type === "conditional") { // next option is based on game logic
					if(node.next.condition === "random") {
						newNode.data.condition = "random";
						AddRandomConditionals(elems, node.id, node.next.data);
					} else {
						AddNonrandomConditionals(elems, node.id, node.next.data);
					}
				}
			} else { // only one option
				elems.edges.push({data: {source: node.id, target: node.next}});
			}
		}
		elems.nodes.push(newNode);
	});
	InitCytoscape(elems);
	if(cy.$("[id^='node']").length >= 0) { nodeCount = parseInt(cy.$("[id^='node']").last().data("id").replace("node", "")) + 1; }
}
function AddOptions(elems, nodeId, nextdata) {
	var choiceid = "CHOICE_" + nodeId;
	elems.nodes.push({data: {id: choiceid}, classes: "choice"});
	for(var i = 0; i < nextdata.length; i++) {
		var nn = nextdata[i], myid = nodeId + "_" + i;
		if(nn.prereq !== undefined) {
			elems.edges.push({data: {source: nodeId, target: myid, prereq: nn.prereq}, classes: "prereq"});
		} else {
			elems.edges.push({data: {source: nodeId, target: myid}});
		}
		elems.nodes.push({data: {id: myid, parent: choiceid, msg: nn.option }, classes: "choiceoption"});
		elems.edges.push({data: {source: myid, target: nn.next}});
	}
}
function AddRandomConditionals(elems, nodeId, nextdata) {
	var count = (1 / nextdata.length).toPrecision(1);
	for(var i = 0; i < nextdata.length; i++) {
		var nn = nextdata[i];
		elems.edges.push({data: {source: nodeId, target: nn.next, weight: nn.weight, prereq: "random (" + (nn.weight || count) + ")"}, classes: "prereq"});
	}
}
function AddNonrandomConditionals(elems, nodeId, nextdata) {
	for(var i = 0; i < nextdata.length; i++) {
		var nn = nextdata[i];
		elems.edges.push({data: {source: nodeId, target: nn.next, prereq: nn.condition}, classes: "prereq"});
	}
}
function SaveJSON(returnString) {
	var nodes = [];
	cy.$("node").each(function() {
	if(this.hasClass("choice") || this.hasClass("choiceoption")) { return; }
		var data = {
			id: this.data("id"),
			data: {
				speaker: this.data("speaker"), 
				message: StringOrUndefined(this.data("rawmsg")), 
				action: StringOrUndefined(this.data("action"))
			}
		};
		var children = GetChildLinks(this);
		if(children.length > 1) {
			var isOption = cy.getElementById(children.first().data("target")).data("parent") !== undefined;
			var next = {
				"type": (isOption)?"options":"conditional", 
				"data": []
			};
			if(isOption) {
				children.each(function() {
					var nextId = this.data("target");
					var nextNode = cy.getElementById(nextId);
					var nextNodeEdge = nextNode.neighborhood("edge[source='" + nextId + "']");
					var nextInfo = {
						next: nextNodeEdge.data("target"),
						option: nextNode.data("msg"),
						prereq: StringOrUndefined(this.data("prereq"))
					};
					next.data.push(nextInfo);
				});
			} else {
				next.condition = StringOrUndefined(this.data("condition"));
				var isRandom = next.condition === "random";
				var node = this;
				var allSameRandom = isRandom, currRand = undefined;
				children.each(function() {
					var nextId = this.data("target");
					var nextNode = cy.getElementById(nextId);
					var betweenEdgeReq = node.edgesTo(nextNode).data("prereq");
					var nextInfo = { next: nextId };
					if(isRandom) {
						nextInfo.weight = StringOrUndefined(betweenEdgeReq.replace(/^random \((0\.\d+)\)$/, "$1"));
						currRand = currRand || nextInfo.weight;
						if(nextInfo.weight !== currRand) { allSameRandom = false; }
					} else {
						nextInfo.condition = betweenEdgeReq;
					}
					next.data.push(nextInfo);
				});
				if(allSameRandom) { next.data.forEach(function(elem) { elem.weight = undefined; }); }
			}
			data.next = next;
		} else if(children.length == 1) {
			data.next = children.data("target");
		}
		nodes.push(data);
	});
	if(returnString) { return nodes; }
	var element = document.createElement("a");
	element.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ "nodes": nodes })));
	element.setAttribute("download", prompt("Specify a filename.") + ".json");
	element.style.display = "none";
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}
function SaveXML() {
	var nodes = SaveJSON(true);
	var xml = "<!DOCTYPE nodes [<!ATTLIST node id ID #REQUIRED>]><nodes>";
	nodes.forEach(function(node) { xml += NodeToXML(node); });
	xml += "</nodes>";
	var element = document.createElement("a");
	element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(xml));
	element.setAttribute("download", prompt("Specify a filename.") + ".xml");
	element.style.display = "none";
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}
function NodeToXML(node) {
	var xml = "<node id=\"" + CleanXML(node.id, true) + "\">";
	var data = node.data;
	if(data.speaker !== undefined) { xml += "<speaker>" + CleanXML(data.speaker) + "</speaker>"; }
	if(data.message !== undefined) { xml += "<message>" + CleanXML(data.message) + "</message>"; }
	if(data.action !== undefined) { xml += "<action>" + CleanXML(data.action) + "</action>"; }
	if(node.next !== undefined) {
		xml += "<next";
		if(node.next.condition !== undefined) { xml += " condition=\"" + CleanXML(node.next.condition, true) + "\""; }
		xml += ">";
		if(node.next instanceof Object) {
			if(node.next.type === "options") { // user choice
				node.next.data.forEach(function(nextElem) {
					xml += "<option";
					if(nextElem.prereq !== undefined) { xml += " prereq=\"" + CleanXML(nextElem.prereq, true) + "\""; }
					xml += "><node>" + CleanXML(nextElem.next) + "</node><text>" + CleanXML(nextElem.option) + "</text></option>";
				});
			} else if(node.next.type === "conditional") { // next option is based on game logic
				if(node.next.condition === "random") {
					node.next.data.forEach(function(nextElem) {
						xml += "<conditional><node>" + CleanXML(nextElem.next) + "</node>";
						if(nextElem.weight !== undefined) { xml += "<weight>" + CleanXML(nextElem.weight) + "</weight>"; }
						xml += "</conditional>";
					});
				} else {
					node.next.data.forEach(function(nextElem) {
						xml += "<conditional><node>" + CleanXML(nextElem.next) + "</node><condition>" + CleanXML(nextElem.condition) + "</condition></conditional>";
					});
				}
			}
		} else { // only one option
			xml += "<node>" + CleanXML(node.next) + "</node>";
		}
		xml += "</next>";
	}
	xml += "</node>";
	return xml;
}
function CleanXML(s, attr) {
	var res = s.replace(/</, "&lt;").replace(/>/, "&gt;");
	if(attr) { res = res.replace(/"/, "\\\""); }
	return res;
}

/*****************
** Editor Setup **
*****************/
function CleanUpMenu() {
	$("#nextType").val("");
	$(".optionDiv").hide();
	$(".editOption").remove();
	$(".editCondition").remove();
	$(".has-error").removeClass("has-error");
	$(".error").remove();
}
function SetNextToSingle() {
	$("#nextType").val("single");
	$("#addButtons").hide();
	$("#editSingleVal").show();
	$("#resetNext").show();
}
function SetNextToOptions() {
	$("#nextType").val("option");
	$("#addButtons").hide();
	$("#editOptionVals").show();
	$("#resetNext").show();
	CreateOptionForCurrentNode();
	CreateOptionForCurrentNode();
}
function SetNextToConditional() {
	$("#nextType").val("conditional");
	$("#addButtons").hide();
	$("#editConditionalVals").show();
	$("#resetNext").show();
	$("#fullCondition").val("");
	ToggleRandomCondition(true);
	CreateConditionForCurrentNode();
	CreateConditionForCurrentNode();
}
function ResetNext() {
	$("#resetNext").hide();
	var cond = $("#nextType").val();
	var nodeId = GetNodeID();
	var node = cy.getElementById(nodeId);
	if(cond == "option") {
		cy.$("[id^='" + nodeId + "_']").remove();
		cy.$("#CHOICE_" + nodeId).remove();
	} else {
		GetChildLinks(node).remove();
	}
	$(".nextOption").hide();
	$("#addButtons").show();
	$("#nextType").val("");
}
function DeleteNode() {
	var nodeId = GetNodeID();
	var node = cy.getElementById(nodeId);
	if($("#nextType").val() == "option") {
		cy.$("[id^='" + nodeId + "_']").remove();
		cy.$("#CHOICE_" + nodeId).remove();
	}
	node.remove();
	CleanUpMenu();
}
function CreateOptionForCurrentNode() { $("#addAdditionalOption").before(GetOptionChoice()); }
function CreateConditionForCurrentNode() { $("#addAdditionalCondition").before(GetConditionChoice()); }
function SaveNode(nodeId) {
	var node = cy.getElementById(nodeId);	
	var nextType = $("#nextType").val();
	if(nextType === "single") {
		if(!ValidateSingleNext(node, nodeId)) { return; }
	} else if(nextType === "option") {
		if(!ValidateOptionsNext(node, nodeId)) { return; }
	} else if(nextType === "conditional") {
		if(!ValidateConditionalNext(node, nodeId)) { return; }
		node.data("condition", $("#fullCondition").val());
	}
	node.data("id", $("#editID").val());
	node.data("speaker", $("#editSpeaker").val());
	node.data("rawmsg", $("#editText").val());
	node.data("action", $("#editAction").val());
	var msg = GetMessage($("#editSpeaker").val(), $("#editText").val(), $("#editAction").val());
	if(msg === "") {
		node.data("msg", "empty");
		node.addClass("noop");
	} else {
		node.data("msg", msg);
		node.removeClass("noop");
	}
	$("#saveNode").attr("disabled", "disabled").html("Saved");
}
function GetChildren(node, nodeId) { return node.neighborhood("edge[source='" + nodeId + "']"); }
function DeleteChildren(node, nodeId) { GetChildren(node, nodeId).remove(); }
function CreateLink(sourceId, targetId, prereq, returnInsteadOfAdd) {
	var edge = { 
		data: { 
			source: sourceId, 
			target: targetId 
		} 
	};
	if(prereq !== "") {
		edge.data.prereq = prereq;
		edge.classes = "prereq";
	}
	if(returnInsteadOfAdd === true) {
		return edge;
	} else {
		cy.add(edge);
	}
}

function ValidateSingleNext(node, nodeId) {
	var nextId = $("#singleTarget").val();
	if(nextId === "") {
		DeleteChildren(node, nodeId);
		return true;
	}
	if(nextId === "*new*") {
		var newNode = CreateNode(false, {x: node.position("x"), y: node.position("y") + 50 });
		nextId = newNode.data("id");
		$("#singleTarget").val(nextId);
	}
	var nextElem = cy.getElementById(nextId);
	if(nextElem.length === 0) {
		$("#singleTarget").val("");
		return ValidateSingleNext(node, nodeId);
	}
	DeleteChildren(node, nodeId);
	CreateLink(nodeId, nextId);
	return true;
}
function ValidateOptionsNext(node, nodeId) {
	var children = GetChildren(node, nodeId);
	if(children.length > 0) {
		cy.$("[id^='" + nodeId + "_']").remove();
		cy.$("#CHOICE_" + nodeId).remove();
	}
	CreateFirstTimeOptions(node, nodeId);
	return true;
}
function CreateFirstTimeOptions(node, nodeId) {
	var choiceId = "CHOICE_" + nodeId;
	var editOptions = $(".editOption"), i = 0;
	var len = editOptions.length - 1;
	var pos = {x: node.position("x") - (50 * len / 2), y: node.position("y") + 50 };
	var elems = [], outerEdges = [];
	elems.push({data: {id: choiceId}, classes: "choice", position: pos, width: 200 });
	editOptions.each(function() {
		var myId = nodeId + "_" + i++;
		elems.push({
			data: {
				id: myId, 
				parent: choiceId, 
				msg: $(this).find(".optionsMessage").val()
			},
			classes: "choiceoption", 
			position: {x: pos.x + 50 * (i - 1), y: pos.y }
		});
		var prereq = $(this).find(".optionsCondition").val();
		elems.push(CreateLink(nodeId, myId, prereq, true));
		var targetId = $(this).find(".optionsTarget").val();
		if(targetId === "*new*") {
			var newNode = CreateNode(false, {x: pos.x + 50 * (i - 1), y: pos.y + 50 });
			var newNodeId = newNode.data("id");
			$(this).find(".optionsTarget").val(newNodeId);
			outerEdges.push({source: myId, target: newNodeId});
		} else {
			var nextElem = cy.getElementById(targetId);
			if(nextElem.length === 1) { outerEdges.push({source: myId, target: targetId}); }
		}
	});
	cy.add(elems);
	outerEdges.forEach(function(e) { CreateLink(e.source, e.target); });
}
function ValidateConditionalNext(node, nodeId) {
	GetChildren(node, nodeId).remove();
	var editConditions = $(".editCondition"), i = 0;
	var fullCondition = $("#fullCondition").val();
	var isRandom = fullCondition === "random";
	var avgWeight = isRandom ? ("random (" + (1 / (editConditions.length)).toString().substr(0, 5) + ")") : undefined;
	var pos = {x: node.position("x") - (50 * ((editConditions.length - 1) / 2)), y: node.position("y") + 50 };
	editConditions.each(function() {
		var targetId = $(this).find(".optionsTarget").val();
		var cond = $(this).find(".optionsCondition").val();
		if(isRandom) { cond = cond === "" ? avgWeight : "random (" + cond + ")"; }
		if(targetId === "*new*") {
			var newNode = CreateNode(false, {x: pos.x + 50 * i++, y: pos.y + 50 });
			var newNodeId = newNode.data("id");
			$(this).find(".optionsTarget").val(newNodeId);
			CreateLink(nodeId, newNodeId, cond);
		} else {
			var nextElem = cy.getElementById(targetId);
			if(nextElem.length === 1) { CreateLink(nodeId, targetId, cond); }
		}
	});
	return true;
}
function GetOptionChoice() { return $("#optionsTemplate").clone().attr("id", "").addClass("editOption"); }
function GetConditionChoice() { return $("#conditionalTemplate").clone().attr("id", "").addClass("editCondition"); }

/*****************
** Node Editing **
*****************/
function CreateNode(goToEdit, pos) {
	var node = cy.add({ data: {id: "node" + nodeCount++, msg: "*new*", rawmsg: "*new*"} });
	if(pos !== undefined) { node.position(pos); }
	cy.center(node);
	cy.$(":selected").unselect();
	node.select();
	if(goToEdit) { EditNode(node); }
	return node;
}
function EditNode(node) {
	if(node.hasClass("choice")) {
		var childNode = cy.$("node[parent='" + node.data("id") + "']")[0];
		var childNodeId = childNode.data("id");
		console.log(childNodeId);
		var parentNode = cy.$("#" + childNode.neighborhood("edge[target='" + childNodeId + "']").data("source"));
		EditNode(parentNode);
		return;
	} else if(node.hasClass("choiceoption")) {
		var nodeId = node.data("id");
		var parentNode = cy.$("#" + node.neighborhood("edge[target='" + nodeId + "']").data("source"));
		EditNode(parentNode);
		return;
	}
	$("#editNodeDiv").show();
	$("#oldID").val(node.data("id"));
	$("#editID").val(node.data("id"));
	$("#editSpeaker").val(node.data("speaker"));
	$("#editText").val(node.data("rawmsg"));
	$("#editAction").val(node.data("action"));
	$("#saveNode").removeAttr("disabled").html("Save");
	var children = GetChildLinks(node);
	$(".nextOption").hide();
	if(children.length > 1) {
		$("#resetNext").show();
		var isOption = cy.getElementById(children.first().data("target")).data("parent") !== undefined;
		if(isOption) {
			$("#editOptionVals").show();
			$(".editOption").remove();
			$("#nextType").val("option");
			children.each(function() {
				var nextId = this.data("target");
				var nextNode = cy.getElementById(nextId);
				var nextNodeEdge = nextNode.neighborhood("edge[source='" + nextId + "']");
				var clone = GetOptionChoice();
				clone.find(".optionsTarget").val(nextNodeEdge.data("target"));
				clone.find(".optionsMessage").val(nextNode.data("msg"));
				clone.find(".optionsCondition").val(this.data("prereq"));
				$("#addAdditionalOption").before(clone);
			});
		} else {
			$("#editConditionalVals").show();
			$(".editCondition").remove();
			$("#nextType").val("conditional");
			$("#fullCondition").val(node.data("condition"));
			var allSameRandom = true, currRand = undefined;
			ToggleRandomCondition($("#fullCondition").val() !== "random");
			children.each(function() {
				var nextId = this.data("target");
				var nextNode = cy.getElementById(nextId);
				var nextNodeEdge = nextNode.neighborhood("edge[source='" + nextId + "']");
				var clone = GetConditionChoice();
				clone.find(".optionsTarget").val(nextId);
				var prereq = this.data("prereq");
				if(/^random \(0\.\d+\)$/.test(prereq)) { prereq = prereq.replace(/^random \((0\.\d+)\)$/, "$1"); }
				currRand = currRand || prereq;
				if(prereq !== currRand) { allSameRandom = false; }
				clone.find(".optionsCondition").val(prereq);
				$("#addAdditionalCondition").before(clone);
			});
			if(allSameRandom) { $(".optionsCondition").val(""); }
		}
	} else if(children.length == 1) {
		$("#resetNext").show();
		$("#editSingleVal").show();
		$("#nextType").val("single");
		$("#editSingleVal").find(".optionsTarget").val(children.first().data("target"));
	} else {
		$("#addButtons").show();
		$("#resetNext").hide();
	}
}
function GetRegularNode(nodeId, nodeData) {
	var res = {
		data: {
			id: nodeId, 
			msg: GetMessage(nodeData.speaker, nodeData.message, nodeData.action),
			rawmsg: nodeData.message,
			speaker: nodeData.speaker,
			action: nodeData.action
		}
	};
	return res;
}
function GetMessage(speaker, message, action) {
	var res = message;
	if(speaker !== undefined && speaker !== "") { res = speaker + ": " + res; }
	if(action !== undefined && action !== "") { res += "\n\n(" + action + ")"; }
	return res;
}