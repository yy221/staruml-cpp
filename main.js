/*
* Copyright (c) 2014-2018 MKLab. All rights reserved.
*
* Permission is hereby granted, free of charge, to any person obtaining a
* copy of this software and associated documentation files (the "Software"),
* to deal in the Software without restriction, including without limitation
* the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
* DEALINGS IN THE SOFTWARE.
*
*/

const codeGenerator = require('./code-generator')
const codeAnalyzer = require('./code-analyzer')
var fs = require('fs');

function getGenOptions () {
  return {
    useTab: app.preferences.get('cpp.gen.useTab'),
    indentSpaces: app.preferences.get('cpp.gen.indentSpaces'),
    useVector: app.preferences.get('cpp.gen.useVector'),
    includeHeader: app.preferences.get('cpp.gen.includeHeader'),
    genCpp: app.preferences.get('cpp.gen.genCpp')
  }
}

function getRevOptions () {
  return {
    association: app.preferences.get('cpp.rev.association'),
    publicOnly: app.preferences.get('cpp.rev.publicOnly'),
    typeHierarchy: app.preferences.get('cpp.rev.typeHierarchy'),
    packageOverview: app.preferences.get('cpp.rev.packageOverview'),
    packageStructure: app.preferences.get('cpp.rev.packageStructure')
  }
}

/**
 * Command Handler for C++ Generate
 *
 * @param {Element} base
 * @param {string} path
 * @param {Object} options
 */
function _handleGenerate (base, path, options) {
  // If options is not passed, get from preference
  options = options || getGenOptions()
  // If base is not assigned, popup ElementPicker
  if (!base) {
    app.elementPickerDialog.showDialog('Select a base model to generate codes', null, type.UMLPackage).then(function ({buttonId, returnValue}) {
      if (buttonId === 'ok') {
        base = returnValue
        // If path is not assigned, popup Open Dialog to select a folder
        if (!path) {
          var files = app.dialogs.showOpenDialog('Select a folder where generated codes to be located', null, null, { properties: [ 'openDirectory' ] })
          if (files && files.length > 0) {
            path = files[0]
            codeGenerator.generate(base, path, options)
          }
        } else {
          codeGenerator.generate(base, path, options)
        }
      }
    })
  } else {
    // If path is not assigned, popup Open Dialog to select a folder
    if (!path) {
      var files = app.dialogs.showOpenDialog('Select a folder where generated codes to be located', null, null, { properties: [ 'openDirectory' ] })
      if (files && files.length > 0) {
        path = files[0]
        codeGenerator.generate(base, path, options)
      }
    } else {
      codeGenerator.generate(base, path, options)
    }
  }
}

/**
 * Command Handler for C++ Reverse
 *
 * @param {string} basePath
 * @param {Object} options
 */
function _handleReverse (basePath, options) {
  // If options is not passed, get from preference
  options = getRevOptions()
  // If basePath is not assigned, popup Open Dialog to select a folder
  if (!basePath) {
    var files = app.dialogs.showOpenDialog('Select Folder', null, null, { properties: [ 'openDirectory' ] })
    if (files && files.length > 0) {
      basePath = files[0]
      codeAnalyzer.analyze(basePath, options)
    }
  }
}

function _handleConfigure () {
  app.commands.execute('application:preferences', 'cpp')
}

//attributes -> {name:type,...}
//operations -> {name:[p0:type0,p1:type1,p2:type2]}
//inherits -> [base0,base1,...]
function create_class (ClassViewMap, _diagram,
    name, inherits, attributes, operations,
    left, top, width, height) {
    var isAbstract = (0 == inherits.length);
    var options = {
        id: "UMLClass", // TODO: UMLInterface if isAbstract is true?
        parent: _diagram._parent,
        diagram: _diagram,
        x1: left,
        y1: top,
        x2: left+width,
        y2: top+height,
        modelInitializer: function (elem) {
            elem.name = name;
            elem.isAbstract = isAbstract;
        }
    };
    //ClassTypeMap[name] = isAbstract;

    // Create a new UMLClass with options
    var classView1 = app.factory.createModelAndView(options);
    if (!classView1) {
        console.log("Failed to create class view");
        return;
    }
    ClassViewMap[name] = classView1;

    var class1 = classView1.model;

    // Add attributes to class
    for (var attribute_name in attributes) {
        options = {
            id:"UMLAttribute",
            parent:class1,
            field:"attributes",
            modelInitializer: function (elem) {
                //TODO: elem.isStatic = false;
                elem.type = attributes[attribute_name];
                if (attribute_name[0] == '+') {
                    elem.name = attribute_name.slice(1);
                    elem.visibility = "public";
                }
                else if (attribute_name[0] == '#') {
                    elem.name = attribute_name.slice(1);
                    elem.visibility = "protected";
                }
                else if (attribute_name[0] == '-') {
                    elem.name = attribute_name.slice(1);
                    elem.visibility = "private";
                }
                else {
                    elem.name = attribute_name;
                }
            }
        };
        var attri = app.factory.createModel(options);
        if (!attri) {
            console.log("Failed to create attribute");
        }
    }

    for (var method_name in operations) {
        options = {
            id:"UMLOperation",
            parent:class1,
            field:"operations",
            modelInitializer: function (elem) {
                //TODO: elem.isStatic = false;
                if (method_name[0] == '+') {
                    elem.name = method_name.slice(1);
                    elem.visibility = "public";
                }
                else if (method_name[0] == '#') {
                    elem.name = method_name.slice(1);
                    elem.visibility = "protected";
                }
                else if (method_name[0] == '-') {
                    elem.name = method_name.slice(1);
                    elem.visibility = "private";
                }
                else {
                    elem.name = method_name;
                }

                if (elem.name[elem.name.length - 1] == '~'/*virtual*/) {
                    elem.isAbstract = true;
                    elem.name = elem.name.slice(0, elem.name.length - 1);
                }
            }
        };

        var method = app.factory.createModel(options);
        if (!method) {
            console.log("Failed to create method");
            continue;
        }

        var param_list = operations[method_name];
        for (var i=0; i<param_list.length; ++i) {
            var pos = param_list[i].indexOf(":");
            options = {
                id:"UMLParameter",
                parent:method,
                field:"parameters",
                modelInitializer: function (elem) {
                    if (pos == 0) {
                        // return type of method is a special parameter with "direction=return"
                        elem.name = "return";
                        elem.type = param_list[i].slice(1);
                        elem.direction = "return";
                    }
                    else {
                        elem.name = param_list[i].slice(0, pos);
                        if (param_list[i].length > pos +1) {
                            elem.type = param_list[i].slice(pos + 1);
                        }
                    }
                }
            };
            var param = app.factory.createModel(options);
            if (!param) {
                console.log("Failed to create parameter");
            }
        }
    }

    // build inherits link
    for (var i=0; i< inherits.length; ++i) {
        if (!ClassViewMap.hasOwnProperty(inherits[i]))  {
            console.log("Error: not found class view for class " + inherits[i]);
            continue;
        }

        var classView2 = ClassViewMap[inherits[i]];
        options = {
            id: "UMLGeneralization", // TODO: how to support UMLInterfaceRealization
            parent: _diagram._parent,
            diagram: _diagram,
            tailView: classView1,
            headView: classView2,
            tailModel: classView1.model,
            headModel: classView2.model,
        };

        var assoView = app.factory.createModelAndView(options);
        if (!assoView) {
            console.log("Failed to create associate view");
        }
    }
}

function get_type_and_name(line, access) {
    var words = line.split(/[ \t]+/);
    if (words.length < 2) {
        return words[0] == "" ? [] : words;
    }

    var i = 0;
    var j = words.length - 1;
    if (words[i] == "" && i < j) i += 1;
    if (words[j] == "" && j > 0) j -= 1;

    var name = words[j];
    var type = words.slice(i, j).join(' ');

    return [access + name, type];
}

/**
 * Command Handler for batch generate class diagram
 *
 * @param {string} basePath
 * @param {Object} options
 * refer to:
 * https://docs.staruml.io/developing-extensions/using-dialogs
 * https://docs.staruml.io/developing-extensions/creating-and-modifying-elements
 */
function _handleBatchClass () {
    var filters = [{ name: "Text Files", extensions: ["txt", "log"] }];
    var selected = app.dialogs.showOpenDialog("Select class description text file...",
        null/*default path*/, filters);
    // Returns an array of paths of selected files
    if (selected == undefined || selected == null) return;
    console.log(selected[0]);

    // load input file
    var contents = fs.readFileSync(selected[0], 'utf8');
    if (contents.length < 4) {
        console.log("Invalid file: " + selected[0]);
        return;
    }
    // console.log(contents);

    // Get a reference to top-level project
    var project = app.repository.select("@Project")[0];
    if (!project) {
        console.log("Failed to create project");
        return;
    }

    //var clses = app.repository.select("@UMLClass");
    // returns elements array of type.UMLClass: [Base, Sub]
    //console.log(clses[0]); //base class
    //console.log(clses[1]); //sub class
    //console.log(clses[1].ownedElements[0].target); //UMLGeneralization

    // Create a UMLModel element as a child of project
    var model = app.factory.createModel({id:"UMLModel", parent:project});
    if (!model) {
        console.log("Failed to create model");
        return;
    }

    // Create a UMLClassDiagram with options
    var options = {
        id: "UMLClassDiagram",
        parent: model,
        diagramInitializer: function (dgm) {
            dgm.name = "MyDiagram" + contents.length;
            dgm.defaultDiagram = true;
        }
    };
    var diagram = app.factory.createDiagram(options);
    if (!diagram) {
        console.log("Failed to create diagram");
        return;
    }

    const CHAR_WIDTH = 6;
    const CHAR_HEIGHT = 10;
    var x = 0;
    var y = 0;
    var access = "";
    var class_line = 0;
    var max_chars = 0;
    var class_name = null;
    var inherits = null;
    var attributes = null;
    var operations = null;
    var ClassViewMap = {};
    // var ClassTypeMap = {};

    // parse this like format:
    /*
    MyClass[:BaseClass1, BaseClass2]
        private:
        int age
        string name
        public:
        void hello(const char* msg, int len)
    NOTE: The line of attributes and operations must be indent 4 space!
    */
    var lines = contents.split('\n');
    for (var i=0; i<lines.length; ++i) {
        if (lines[i][0] > ' ') {
            if (class_name != null) {
                var w = max_chars*CHAR_WIDTH;
                var h = (i - class_line)*CHAR_HEIGHT;
                create_class(ClassViewMap, diagram, class_name,
                 inherits, attributes, operations, x, y, w, h);
                x += w;
                y += h;
                max_chars = 0;
            }

            var words = lines[i].split(/[ ,:]+/);
            if (words.length > 1) {
                inherits = words.slice(1);
            }
            else {
                inherits = []; // super class
            }
            class_line = i;
            class_name = words[0];
            operations = {};
            attributes = {};
            access = "+";  //default is public access.

            if (class_name.length > max_chars) {
                max_chars = class_name.length;
            }

            continue;
        }

        if (lines[i].length > max_chars) {
            max_chars = lines[i].length;
        }

        var pos = lines[i].indexOf('(');
        if (pos != -1) {
            // operation
            var words = get_type_and_name(lines[i].slice(0, pos), access);
            if (words.length > 1) {
                var name = words[0];
                var return_type = words[1];
                var pos3 = return_type.indexOf("virtual ");
                if (0 == pos3) {
                    return_type = return_type.slice(pos3 + 8); //trim virtual
                    name += "~"; // virtual method
                }

                var pos2 = lines[i].lastIndexOf(')');
                var words2 = lines[i].slice(pos + 1, pos2).split(',');
                var params = [];
                if (return_type && return_type != "void") {
                    //NOTE: constructor has no return value
                    params.push(":" + return_type);
                }

                for (var j = 0; j < words2.length; ++j) {
                    var words3 = get_type_and_name(words2[j], "");
                    if (words3.length > 1) {
                        params.push(words3[0] + ":" + words3[1]);
                    }
                    else if (words3.length > 0) {
                        // Only type name here!
                        params.push(words3[0] + ":");
                    }
                }

                operations[name] = params;
            }
        }
        else {
            if (lines[i].indexOf("private:") > 0)
                access = "-";
            else if (lines[i].indexOf("protected:") > 0)
                access = "#";
            else if (lines[i].indexOf("public:") > 0)
                access = "+";
            else {
                // attribute
                var words = get_type_and_name(lines[i], access);
                if (words.length > 1) {
                    attributes[words[0]] = words[1];
                }
            }
        }
    }

    // the last one
    if (class_name != null) {
        var w = max_chars*CHAR_WIDTH;
        var h = (lines.length - class_line)*CHAR_HEIGHT;
        create_class(ClassViewMap, diagram, class_name,
         inherits, attributes, operations, x, y, w, h);
    }
}

function init () {
  app.commands.register('cpp:generate', _handleGenerate)
  app.commands.register('cpp:reverse', _handleReverse)
  app.commands.register('cpp:configure', _handleConfigure)
  app.commands.register('cpp:class', _handleBatchClass)
}

exports.init = init
