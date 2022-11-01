from django.shortcuts import render
from django.http import HttpResponse
import json
from main.graph import fromJsonToGraph
import networkx as nx
from rest_framework.decorators import api_view

# Takes a request -> responst / request


@api_view(["POST"])
def backboneFromGr(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        G = fromJsonToGraph(body['nodes'], body['roads'])
        G = G.to_undirected()
        G = nx.k_core(G, k=2)
        G = G.to_directed()
        cycles = sorted(nx.simple_cycles(G))
        filter_cycles = []
        for cycle in cycles:
            if len(cycle) > 2:
                filter_cycles.append(cycle)
        cycles = []

        for i in range(len(filter_cycles)):
            cycles.append(filter_cycles[i])
            for j in range(len(filter_cycles)):
                equal = True
                if(len(filter_cycles[i]) == len(filter_cycles[j])):
                    for k in range(len(filter_cycles[i])):
                        if (filter_cycles[i][k] != filter_cycles[j][k]):
                            equal = False
                            break
                    if(equal):
                        break

                if set(filter_cycles[j]).issubset(set(filter_cycles[i])):
                    cycles.pop()
                    break

        #print(G, cycles, len(cycles))
        return HttpResponse(json.dumps(cycles))


@ api_view(["POST"])
def fp(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        G = fromJsonToGraph(body['nodes'], body['roads'])
        try:
            p = nx.shortest_path(
                G, body['params'][0], body['params'][1], weight="length")
        except Exception as e:
            p = []

        fsp = []
        for i in range(1, len(p)):
            for key in body['roads']:
                road = body['roads'][key]
                if road[3] == "both" or road[3] == "oneway":
                    if road[0] == p[i-1] and road[1] == p[i]:
                        if len(fsp) == i-1:
                            fsp.append(key)
                        elif float(body['roads'][key][2]) < float(body['roads'][fsp[i-1]][2]):
                            fsp[i-1] = key
                if road[3] == "both" or road[3] == "reverse":
                    if road[0] == p[i] and road[1] == p[i-1]:
                        if len(fsp) == i-1:
                            fsp.append(key)
                        elif float(body['roads'][key][2]) < float(body['roads'][fsp[i-1]][2]):
                            fsp[i-1] = key

        try:
            p = nx.shortest_path(
                G, body['params'][0], body['params'][1], weight="maxSpeed")
        except Exception as e:
            p = []

        ffp = []
        for i in range(1, len(p)):
            for key in body['roads']:
                road = body['roads'][key]
                if road[3] == "both" or road[3] == "oneway":
                    if road[0] == p[i-1] and road[1] == p[i]:
                        if len(ffp) == i-1:
                            ffp.append(key)
                        elif float(body['roads'][key][4]) < float(body['roads'][ffp[i-1]][4]):
                            ffp[i-1] = key
                if road[3] == "both" or road[3] == "reverse":
                    if road[0] == p[i] and road[1] == p[i-1]:
                        if len(ffp) == i-1:
                            ffp.append(key)
                        elif float(body['roads'][key][4]) < float(body['roads'][ffp[i-1]][4]):
                            ffp[i-1] = key

        response = json.dumps([fsp, ffp])

        # print(response)
        return HttpResponse(response)


@ api_view(["POST"])
def connectivity(request):
    response = []
    if request.method == 'POST':
        body = json.loads(request.body)
        G = fromJsonToGraph(body['nodes'], body['roads'])
        response.append(nx.is_weakly_connected(G))
        response.append(nx.is_strongly_connected(G))
        if not response[1]:
            c = [c for c in sorted(
                nx.strongly_connected_components(G), key=len, reverse=True)]
            roads = []
            for i in range(len(c)):
                roads.append([])
                comp = list(c[i])
                for j in range(len(comp)):
                    for key in body['roads']:
                        link = body['roads'][key][:2]
                        if comp[j] in link and ((link[0] != comp[j] and link[0] in comp) or (link[1] != comp[j] and link[1] in comp or (link[0] == comp[j] and link[1] == comp[j]))):
                            if key not in roads[i]:
                                roads[i].append(key)
            response.append(len(c))
            response.append(roads)
            # print(c)
        response = json.dumps(response)

        # print(response)
        return HttpResponse(response)


@ api_view(["POST"])
def analysis(request):
    if request.method == 'POST':
        body = json.loads(request.body)
        G = fromJsonToGraph(body['nodes'], body['roads'])
        degrees = nx.degree(G)
        # print(degrees)
        maxDegree = max(degrees, key=lambda item: item[1])[1]

        distribution = [0] * (maxDegree+1)
        for node in degrees:
            distribution[node[1]] += 1
        # print(distribution)

        connectivity = []
        connectivity.append(nx.is_weakly_connected(G))
        connectivity.append(nx.is_strongly_connected(G))
        if not connectivity[1]:
            c = [c for c in sorted(
                nx.strongly_connected_components(G), key=len, reverse=True)]
            roads = []
            for i in range(len(c)):
                roads.append([])
                comp = list(c[i])
                for j in range(len(comp)):
                    for key in body['roads']:
                        link = body['roads'][key][:2]
                        if comp[j] in link and ((link[0] != comp[j] and link[0] in comp) or (link[1] != comp[j] and link[1] in comp or (link[0] == comp[j] and link[1] == comp[j]))):
                            if key not in roads[i]:
                                roads[i].append(key)
            connectivity.append(len(c))
            connectivity.append(roads)
            # print(c)

        is_planar, P = nx.check_planarity(G)

        try:
            diameter = nx.diameter(G)
        except Exception as e:
            diameter = "-"

        clustering_coeff = round(nx.average_clustering(G), 4)

        response = json.dumps(
            [distribution, connectivity, is_planar,  diameter,  clustering_coeff])
        # print(response)

        return HttpResponse(response)
