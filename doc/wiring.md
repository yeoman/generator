

<!-- Start lib/actions/wiring.js -->

## domUpdate(html, tagName, content, mode)

Update a file containing HTML markup with new content, either
appending, prepending or replacing content matching a particular
selector.

The following modes are available:

  - `a` Append
  - `p` Prepend
  - `r` Replace
  - `d` Delete

### Params: 

* **String** *html* 

* **String** *tagName* 

* **String** *content* 

* **String** *mode* 

## append(html, tagName, content)

Insert specific content as the last child of each element matched
by the `tagName` selector.

### Params: 

* **String** *html* 

* **String** *tagName* 

* **String** *content* 

## prepend(html, tagName, content)

Insert specific content as the first child of each element matched
by the `tagName` selector.

### Params: 

* **String** *html* 

* **String** *tagName* 

* **String** *content* 

## appendToFile(path, tagName, content)

Insert specific content as the last child of each element matched
by the `tagName` selector. Writes to file.

### Params: 

* **String** *path* 

* **String** *tagName* 

* **String** *content* 

## prependToFile(path, tagName, content)

Insert specific content as the first child of each element matched
by the `tagName` selector. Writes to file.

### Params: 

* **String** *path* 

* **String** *tagName* 

* **String** *content* 

## generateBlock(blockType, optimizedPath, filesBlock, searchPath)

Generate a usemin-handler block.

### Params: 

* **String** *blockType* 

* **String** *optimizedPath* 

* **String** *filesBlock* 

* **String|Array** *searchPath* 

## appendFiles(htmlOrOptions, fileType, optimizedPath, sourceFileList, attrs, searchPath)

Append files, specifying the optimized path and generating the necessary
usemin blocks to be used for the build process. In the case of scripts and
styles, boilerplate script/stylesheet tags are written for you.

### Params: 

* **String|Object** *htmlOrOptions* 

* **String** *fileType* 

* **String** *optimizedPath* 

* **Array** *sourceFileList* 

* **Object** *attrs* 

* **String** *searchPath* 

## attributes(attrs)

Computes a given Hash object of attributes into its HTML representation.

### Params: 

* **Object** *attrs* 

## appendScripts(html, optimizedPath, sourceFileList, attrs)

Scripts alias to `appendFiles`.

### Params: 

* **String** *html* 

* **String** *optimizedPath* 

* **Array** *sourceFileList* 

* **Object** *attrs* 

## removeScript(html, scriptPath)

Simple script removal.

### Params: 

* **String** *html* 

* **String** *scriptPath* 

## appendStyles(html, optimizedPath, sourceFileList, attrs)

Style alias to `appendFiles`.

### Params: 

* **String** *html* 

* **String** *optimizedPath* 

* **Array** *sourceFileList* 

* **Object** *attrs* 

## removeStyle(html, path)

Simple style removal.

### Params: 

* **String** *html* 

* **String** *path* 

## appendScriptsDir(html, optimizedPath, sourceScriptDir, attrs)

Append a directory of scripts.

### Params: 

* **String** *html* 

* **String** *optimizedPath* 

* **String** *sourceScriptDir* 

* **Object** *attrs* 

## appendStylesDir(html, optimizedPath, sourceStyleDir, attrs)

Append a directory of stylesheets.

### Params: 

* **String** *html* 

* **String** *optimizedPath* 

* **String** *sourceStyleDir* 

* **Object** *attrs* 

## readFileAsString(filePath)

Read in the contents of a resolved file path as a string.

### Params: 

* **String** *filePath* 

## writeFileFromString(html, filePath)

Write the content of a string to a resolved file path.

### Params: 

* **String** *html* 

* **String** *filePath* 

<!-- End lib/actions/wiring.js -->

