import json
from volatility3.cli.text_renderer import JsonRenderer
from volatility3.framework import interfaces
from typing import Any, List, Tuple, Dict, Optional, Union

class MuteProgress(object):
    def __init__(self):
        self._max_message_len = 0

    def __call__(self, progress: Union[int, float], description: str = None):
        pass

# Turns plugin output to JSON
class ReturnJsonRenderer(JsonRenderer):
    def render(self, grid: interfaces.renderers.TreeGrid):
        final_output = ({}, [])

        def visitor(
            node: interfaces.renderers.TreeNode, 
            accumulator: Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]] 
            ) -> Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
            # Nodes always have a path value, giving them a path_depth of at least 1, we use max just in case
            acc_map, final_tree = accumulator
            node_dict = {"__children": []}
            for column_index in range(len(grid.columns)):
                column = grid.columns[column_index]
                renderer = self._type_renderers.get(column.type, self._type_renderers["default"])
                data = renderer(list(node.values)[column_index])
                if isinstance(data, interfaces.renderers.BaseAbsentValue):
                    data = None
                node_dict[column.name] = data
            if node.parent:
                acc_map[node.parent.path]["__children"].append(node_dict)
            else:
                final_tree.append(node_dict)
            acc_map[node.path] = node_dict
            return (acc_map, final_tree)

        error = grid.populate(visitor, final_output, fail_on_errors=False)
        return(final_output[1], error)
