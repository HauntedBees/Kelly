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
var cy = null, nodeCount = 0;

$(document).ready(function() {
	InitCytoscape();
	
	$("#newGraph").on("click", function() { if(confirm("Any unsaved changes will be lost. Continue?")) { cy.load(); } });
	$("#loadJSON").on("click", function() { CleanUp(); $("#loadFileDiv").show(); });
	$("#saveJSON").on("click", function() { SaveJSON(); });
	
	$("#addNode").on("click", function() { CleanUp(); CreateNode(true); });
	
	$("#addSingle").on("click", function() { AddSingleChild(GetNodeID(), true); });
	$("#saveNode").on("click", function() { SaveNode(GetNodeID()); });
	$(".saveable").on("keydown", function() { $("#saveNode").removeAttr("disabled").html("Save"); });
});

function GetNodeID() { return $("#oldID").val(); }
function GetChildLinks(node) { return node.neighborhood("edge[source='" + node.data("id") + "']"); }

function StringOrUndefined(s) { if(s==="") { return undefined;} return s; } // wrap me around non-mandatory values in JSON export to prevent empty strings from showing up
function SaveJSON() {
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
				var isRandom = children.first().data("prereq") === "random";
				console.log(isRandom);
				next.random = isRandom;
				children.each(function() {
					var nextId = this.data("target");
					var nextNode = cy.getElementById(nextId);
					var nextNodeEdge = nextNode.neighborhood("edge[source='" + nextId + "']");
					var nextInfo = { next: nextId };
					if(isRandom) {
						nextInfo.weight = StringOrUndefined(this.data("weight"));
					} else {
						nextInfo.condition = this.data("prereq");
					}
					next.data.push(nextInfo);
				});
			}
			data.next = next;
		} else if(children.length == 1) {
			data.next = children.data("target");
		}
		nodes.push(data);
	});
	var url = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify({ "nodes": nodes }));
	window.open(url, '_blank');
	window.focus();
}


function CleanUp() {
	$(".optionDiv").hide();
	$(".editOption").remove();
}

function AddSingleChild(nodeId, save) {
	if(save) { SaveNode(nodeId); }
	var oldNode = cy.getElementById(nodeId);
	var newNode = CreateNode(true, {x: oldNode.position("x"), y: oldNode.position("y") + 50 });
	cy.add({ data: { source: nodeId, target: newNode.data("id") } });
}

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
		$("#editOptionVals").show();
		$(".editOption").remove();
		var isOption = cy.getElementById(children.first().data("target")).data("parent") !== undefined;
		if(isOption) {
			children.each(function() {
				var nextId = this.data("target");
				var nextNode = cy.getElementById(nextId);
				var nextNodeEdge = nextNode.neighborhood("edge[source='" + nextId + "']");
				var clone = $("#optionsTemplate").clone().attr("id", "").addClass("editOption");
				clone.find(".optionsTarget").val(nextNodeEdge.data("target"));
				clone.find(".optionsMessage").val(nextNode.data("msg"));
				clone.find(".optionsCondition").val(this.data("prereq"));
				$("#editOptionVals").append(clone);
			});
		} else {
			/*var isRandom = children.first().data("prereq") === "random";
			console.log(isRandom);
			next.random = isRandom;
			children.each(function() {
				var nextId = this.data("target");
				var nextNode = cy.getElementById(nextId);
				var nextNodeEdge = nextNode.neighborhood("edge[source='" + nextId + "']");
				var nextInfo = { next: nextId };
				if(isRandom) {
					nextInfo.weight = this.data("weight");
				} else {
					nextInfo.condition = this.data("prereq");
				}
				next.data.push(nextInfo);
			});*/
		}
	} else if(children.length == 1) {
		$("#singleNext").show();
		$("#singleTarget").val(children.first().data("target"));
	} else {
		$("#addButtons").show();
	}
}
function SaveNode(nodeId) {
	var node = cy.getElementById(nodeId);
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


function GetRegularNode(nodeId, nodeData) {
	var res = {
		data: {
			id: nodeId, 
			msg: GetMessage(nodeData.speaker, nodeData.message, nodeData.action),
			rawmsg: nodeData.message,
			speaker: nodeData.speaker,
			action: nodeData.action
		}, 
		classes: "message"
	};
	return res;
}
function GetMessage(speaker, message, action) {
	var res = message;
	if(speaker !== undefined && speaker !== "") { res = speaker + ": " + res; }
	if(action !== undefined && action !== "") { res += "\n\n(" + action + ")"; }
	return res;
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
		elems.edges.push({data: {source: nodeId, target: nn.next, prereq: "random", weight: nn.weight, display: "random (" + (nn.weight || count) + ")"}, classes: "randweight"});
	}
}
function AddNonrandomConditionals(elems, nodeId, nextdata) {
	for(var i = 0; i < nextdata.length; i++) {
		var nn = nextdata[i];
		elems.edges.push({data: {source: nodeId, target: nn.next, prereq: nn.condition}, classes: "prereq"});
	}
}

function DisplayFromFile(data) { // data is JSON, ID cannot be a decimal number
	var nodesJSON = data.nodes;
	var elems = {nodes: [], edges: []};
	nodesJSON.forEach(function(node) {
		if(node.data !== undefined) {
			elems.nodes.push(GetRegularNode(node.id, node.data));
		} else {
			elem.nodes.push({data: {id: node.id, msg: "empty"}, classes: "noop"});
		}
		if(node.next !== undefined) {
			if(node.next instanceof Object) {
				if(node.next.type === "options") { // user choice
					AddOptions(elems, node.id, node.next.data);
				} else if(node.next.type === "conditional") { // next option is based on game logic
					if(node.next.random) {
						AddRandomConditionals(elems, node.id, node.next.data);
					} else {
						AddNonrandomConditionals(elems, node.id, node.next.data);
					}
				}
			} else { // only one option
				elems.edges.push({data: {source: node.id, target: node.next}});
			}
		}
	});
	InitCytoscape(elems);
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
					"padding-bottom": padding
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
			{ selector: ".message", style: { "text-wrap": "wrap", "text-max-width": 300 } },
			{ selector: ".choice", style: { "text-valign": "top", "background-color": "#AAAAAA" } }, 
			{ selector: ".choiceoption", style: { "background-color": "#888888" } }, 
			{ selector: ".prereq", style: { "label": "data(prereq)" } }, 
			{ selector: ".randweight", style: { "label": "data(display)" } }
		],
		elements: elems
	});
	cy.on("tap", "node", function() { CleanUp(); EditNode(this); return false; });
}