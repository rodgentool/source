import networkx as nx


def fromJsonToGraph(nodes, edges):
    G = nx.DiGraph()
    for node in nodes:
        G.add_node(node)
    for key in edges:
        if edges[key][3] == "both" or edges[key][3] == "oneway":
            G.add_edge(edges[key][0], edges[key][1], length=float(
                edges[key][2]), maxSpeed=float(edges[key][4]))
        if edges[key][3] == "both" or edges[key][3] == "reverse":
            G.add_edge(edges[key][1], edges[key][0], length=float(
                edges[key][2]), maxSpeed=float(edges[key][4]))
    return G
