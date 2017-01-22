'use strict';
// require("material-design-icons");
// require('underscore');
require('normalize.css');
require('./app.styl');

// console.log('Hello world!');
var width = 300;
var height = 300;
var radius = Math.min(width, height) / 2;
var defaultNode = null;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
    w: 90, h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
var colors = {
    "FrontEnd": "#7fbcea",
    "JavaScript": "#6897BB",
    "Vanilla JS" : "#4c789a",
    "React JS" : "#4c789a",
    "Angular JS" : "#4c789a",
    "CoffeScript" : "#4c789a",
    "jQuery" : "#4c789a",
    "HTML 5": "#CC7832",
    "CSS": "#bb641c",
    "Stylus" : "#a5510d",
    "Less" : "#a5510d",
    "BackEnd": "#B389C5",
    "Node JS" : "#b762dc",
    "Phyton" : "#b762dc",
    "PHP" : "#b762dc",
    "MySQL" : "#b762dc",
    "ActionScript": "#77B767",
    "Flash" : "#e25959"
};

var totalSize = 0;

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

d3.text("data.csv", function(text) {
    var csv = d3.csv.parseRows(text);
    var json = buildHierarchy(csv);
    createVisualization(json);
});

function createVisualization(json) {
    vis.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

    var nodes = partition.nodes(json)
        .filter(function(d) {
            return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
        });

    d3.select("#container")
        .append("svg:text")
        .attr("x", radius/ 30)
        .attr("y", radius/ 30)
        .attr("dy", "0.35em")
        .attr("id", "percentage")
        .attr("text-anchor", "middle")
        .style("fill", "#A9B7C6")
        .style("visibility", "hidden")
        .on("mouseleave", mouseleave);


    var path = vis.data([json])
        .selectAll("path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("display", function(d) { return d.depth ? null : "none"; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("opacity", 0)
        .on("mouseover", mouseover)
        .style("fill", function(d) { return colors[d.name]; })
        .transition().duration(function (d, i) {
            return i * 200;
        })
        .style("opacity", 1);

    totalSize = path.node().__data__.value;

    // Basic setup of page elements.
    initializeBreadcrumbTrail();
    getDefaultNode(nodes);
    drawLegend(nodes);

    d3.select("#togglelegend").on("click", function () {
        toggleLegend(this.checked);
    });
};

// default value
function getDefaultNode() {
    if(!defaultNode && arguments[0]) defaultNode = getAncestors(arguments[0][2]);
    updateBreadcrumbs(defaultNode);
    // var percentage = (100 * defaultNode[defaultNode.length - 1].value / totalSize).toPrecision(3);
    // var percentageString = percentage + "%";
    // if (percentage < 0.1) {
    //     percentageString = "< 0.1%";
    // }
    //
    // d3.select("#percentage")
    //     .text(percentageString)
    //     .style("visibility", "");
}

function mouseover(d) {

    var percentage = (100 * d.value / totalSize).toPrecision(3);
    var percentageString = percentage + "%";
    if (percentage < 0.1) {
        percentageString = "< 0.1%";
    }

    d3.select("#percentage")
        .text(percentageString)
        .style("visibility", "");

    var sequenceArray = getAncestors(d);
    updateBreadcrumbs(sequenceArray, percentageString);

    d3.selectAll("path")
        .style("opacity", 0.3);

    vis.selectAll("path")
        .filter(function(node) {
            return (sequenceArray.indexOf(node) >= 0);
        })
        .style("opacity", 1);
}

function mouseleave(d) {

    // Hide the breadcrumb trail
    d3.select("#trail")
        .style("visibility", "hidden");

    // Deactivate all segments during transition.
    d3.selectAll("path").on("mouseover", null);

    // Transition each segment to full opacity and then reactivate it.
    d3.selectAll("path")
        .transition()
        .duration(300)
        .style("opacity", 1)
        .each("end", function() {
            d3.select(this).on("mouseover", mouseover);
        });

    d3.select("#percentage")
        .style("visibility", "hidden");

    getDefaultNode();
}

function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}

function initializeBreadcrumbTrail() {
    // Add the svg area.
    var trail = d3.select("#sequence").append("svg:svg")
        .attr("width", width*2)
        .attr("height", 70)
        .attr("id", "trail");
    // Add the label at the end, for the percentage.
    // trail.append("svg:text")
    //     .attr("id", "endlabel")
    //     .style("fill", "#A9B7C6");
}

function breadcrumbPoints(d, i) {
    var points = [];
    points.push("0,0");
    points.push(b.w + ",0");
    points.push(b.w + b.t + "," + (b.h / 2));
    points.push(b.w + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
        points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
}

function updateBreadcrumbs(nodeArray, percentageString) {

    // Data join; key function combines name and depth (= position in sequence).
    var g = d3.select("#trail")
        .selectAll("g")
        .data(nodeArray, function(d) { return d.name + d.depth; });

    // Add breadcrumb and label for entering nodes.
    var entering = g.enter().append("svg:g");

    entering.append("svg:polygon")
        .attr("points", breadcrumbPoints)
        .style("fill", function(d) { return colors[d.name]; });

    entering.append("svg:text")
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name; });

    // Set position for entering and updating nodes.
    g.attr("transform", function(d, i) {
        return "translate(" + i * (b.w + b.s) + ", 0)";
    });

    // Remove exiting nodes.
    g.exit().remove();

    // Now move and update the percentage at the end.
    d3.select("#trail").select("#endlabel")
        .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(percentageString);

    // Make the breadcrumb trail visible, if it's hidden.
    d3.select("#trail")
        .style("visibility", "");

}

function drawLegend(nodes) {

    // console.log(nodes)
    nodes.shift();
    var li = {
        w: 100, h: 30, s: 3, r: 3
    };

    var legend = d3.select("#legend")
        .append("svg:svg")
        .attr("width", li.w)
        .attr("height", d3.keys(colors).length * (li.h + li.s))
        .on("mouseleave", mouseleave);

    var g = legend.selectAll("g")
        .data(nodes)
        .enter().append("svg:g")
        .attr("display", function(d) { return d.depth ? null : "none"; })
        .attr("transform", function(d, i) {
            return "translate(0," + i * (li.h + li.s) + ")";
        })
        .on("mouseover", function (d) {
            d3.select(this.childNodes[0]).style('fill', '#252b31');
            mouseover(d);
        })
        .on('mouseleave', function () {
            d3.select(this.childNodes[0]).style('fill', '#313335');
        });


    g.append("svg:rect")
        .attr("rx", li.r)
        .attr("ry", li.r)
        .attr("width", li.w)
        .attr("height", li.h)
        .attr("class", "rect-legend")
        .style("stroke", function(d) { return colors[d.name]; })
        .style("fill", "#313335");
;
    g.append("svg:text")
        .attr("x", li.w / 2)
        .attr("y", li.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name; })
        .style("fill", function(d) { return colors[d.name]; });
}

function toggleLegend(checked) {

    var legend = d3.select("#legend")
        .transition().duration(700)
        .style('left', function () {
            return checked ? '0px' : '-130px';
        });

    d3.select("#chart .desc")
        .classed("full", !checked);
}

function buildHierarchy(csv) {
    var root = {"name": "root", "children": []};
    for (var i = 0; i < csv.length; i++) {
        var sequence = csv[i][0];
        var size = +csv[i][1];
        if (isNaN(size)) { // e.g. if this is a header row
            continue;
        }
        var parts = sequence.split("-");
        var currentNode = root;
        for (var j = 0; j < parts.length; j++) {
            var children = currentNode["children"];
            var nodeName = parts[j];
            var childNode;
            if (j + 1 < parts.length) {
                // Not yet at the end of the sequence; move down the tree.
                var foundChild = false;
                for (var k = 0; k < children.length; k++) {
                    if (children[k]["name"] == nodeName) {
                        childNode = children[k];
                        foundChild = true;
                        break;
                    }
                }
                // If we don't already have a child node for this branch, create it.
                if (!foundChild) {
                    childNode = {"name": nodeName, "children": []};
                    children.push(childNode);
                }
                currentNode = childNode;
            } else {
                // Reached the end of the sequence; create a leaf node.
                childNode = {"name": nodeName, "size": size};
                children.push(childNode);
            }
        }
    }
    return root;
};