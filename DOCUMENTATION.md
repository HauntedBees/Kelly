# Kevin Dialogue Node Set Format

## Main Container
There is one outer element for any Kevin JSON or XML file, "nodes". In JSON, "nodes" is an array of Dialogue Nodes, and in XML, "nodes" is an element whose children are all Dialogue Nodes.
## Dialogue Nodes
### Node ID
Each Dialogue Node _must_ contain an "id" element. In JSON, this is a property, and in XML, this is an attribute in the node element.
* For XML, the id should be specified in the DOCTYPE: ```<!DOCTYPE nodes [<!ATTLIST node id ID #REQUIRED>]>```

### Node Data
Dialogue Nodes will generally contain data. In JSON, this is a property object containing name value pairs. In XML, the Node Data will be children of the main node element. Node Data can contain the following elements:
* **Speaker:** Name of whoever/whatever is saying the message. If empty, message can be a thought, action, or narration.
* **Message:** The Dialogue message itself. If this and the speaker are both empty, this Dialogue Node will be a _no-op._
* **Action:** An optional action that will be executed when this Dialogue Node is reached. Generally a script or function name.

If this Dialogue Node has no Speaker and no Message, it will be a no-op. When a no-op is reached, the Node's action, if it exists, should be executed, then the Dialogue Chain should immediately move on to the next Node, with no display to the user.
### Node Next
To determine what Dialogue Node should come next, the Node Next data should be used. If there is no Node Next data, then the Node is the end of a Dialogue Chain. In JSON, this is a property like the "id" and "data" objects. In XML, the Node Next will be a child of the main node alongside the Node Data. There are three kinds of Node Next:
* **Single Next:** Just an ID to the next Dialogue Node.
* **Conditional Next:** When there are multiple potential Dialogue Nodes to move on to, but which Node it goes to is not determined by user input, but determined either randomly or based on custom functions.
* **Options Next:** When there the next Dialogue Node is determined by user input.

#### Conditional Next Properties
The _next_ element contains two or more next nodes (stored in an array in JSON and as "conditional" element children in XML). Each of these nodes will have a Node ID pointing to the next node and either a _condition_ or _weight_ property. The _next_ element itself may optionally have a "condition" value (an attribute in XML). The "condition" value behaves as follows:
* **condition = "random":** One of the conditional elements will be picked randomly. If the conditionals have "weight" properties, then those should be used to weigh the randomness (i.e. If there are two nodes, one with a weight of 0.6 and one with a weight of 0.4, there is a 60% chance the first one will be picked. If no weights are given, then each node has a 50% chance of being picked). The child nodes do not need to have a "condition" value in this case.
* **condition is anything else:** The function or script will be evaluated, and its returned value will be compared to the condition values of each node. Whichever node matches the return value will be returned. If there is no match, then any node with a condition value of "else" will be returned. If there is no "else" condition, then the last element will be returned.
* **no condition:** From the first element to the last, each "condition" value will be evaluated. Each should contain a function or script that returns a boolean value. The first node with a condition that returns _true_ will be returned. Otherwise, either the first node with a condition of "else" or the last element will be returned.

#### Options Next Properties
The _next_ element contains two or more next nodes (stored in an array in JSON and as "option" element children in XML). Each of these nodes must have a Node ID pointing to the next node and a property with the option's display text. There may optionally a "prereq" property which will be a function or script that, when _false_, should hide the option from display.

## Schema
### JSON Schema
```JSON
{
	"nodes": [
		{
			"id": "singleNext",
			"data": {
				"speaker": string,
				"message": string,
				"action": void_script
			},
			"next": id
		},
		{
			"id": "optionsNext",
			"data": {
				"message": string
			},
			"next": {
				"type": "options",
				"data": [
					{
						"option": string,
						"next": id
					},
					{
						"option": string,
						"next": id,
						"prereq": bool_script
					}
				]
			}
		},
		{
			"id": "conditionalNext",
			"data": {
				"speaker": string,
				"message": string
			},
			"next": {
				"type": "conditional",
				"data": [
					{
						"condition": bool_script,
						"next": id
					},
					{
						"condition": "else",
						"next": id
					}
				]
			}
		},
		{
			"id": "conditionalNext_fullCondition",
			"data": {
				"message": string
			}, 
			"next": {
				"type": "conditional",
				"condition": string_script,
				"data": [
					{
						"condition": string,
						"next": id
					}, 
					{
						"condition": "else",
						"next": id
					}
				]
			}
		},
		{
			"id": "conditionalNext_random",
			"data": {
				"message": string
			}, 
			"next": {
				"type": "conditional",
				"condition": "random",
				"data": [
					{"next": id }, 
					{"next": id }
				]
			}
		},
		{
			"id": "conditionalNext_weightedRandom",
			"data": {
				"message": string
			}, 
			"next": {
				"type": "conditional",
				"condition": "random",
				"data": [
					{
						"next": id,
						"weight": float
					}, 
					{
						"next": id,
						"weight": float
					}
				]
			}
		}
	]
}
```
### XML Schema
```XML
<!DOCTYPE nodes [<!ATTLIST node id ID #REQUIRED>]>
<nodes>
    <node id="singleNext">
        <speaker>string</speaker>
        <message>string</message>
        <action>void_script</action>
        <next>
            <node>id</node>
        </next>
    </node>
    <node id="optionsNext">
        <message>string</message>
        <next>
            <option>
            </option>
            <option prereq=bool_script>
                <text>string</text>
                <node>id</node>
            </option>
        </next>
    </node>
    <node id="conditionalNext">
        <speaker>string</speaker>
        <message>string</message>
        <next>
            <conditional>
                <condition>bool_script</condition>
                <node>id</node>
            </conditional>
            <conditional>
                <condition>else</condition>
                <node>id</node>
            </conditional>
        </next>
    </node>
    <node id="conditionalNext_fullCondition">
        <message>string</message>
        <next condition=string_script>
            <conditional>
                <condition>string</condition>
                <node>id</node>
            </conditional>
            <conditional>
                <condition>else</condition>
                <node>id</node>
            </conditional>
        </next>
    </node>
    <node id="conditionalNext_random">
        <message>string</message>
        <next condition="random">
            <conditional>
                <node>id</node>
            </conditional>
            <conditional>
                <node>id</node>
            </conditional>
        </next>
    </node>
    <node id="conditionalNext_weightedRandom">
        <message>string</message>
        <next condition="random">
            <conditional>
                <node>id</node>
                <weight>float</weight>
            </conditional>
            <conditional>
                <node>id</node>
                <weight>float</weight>
            </conditional>
        </next>
    </node>
</nodes>
```