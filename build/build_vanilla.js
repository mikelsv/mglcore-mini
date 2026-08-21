import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import posthtml from 'posthtml';

import { mglBundleBase,
    projectDir, outDir, buildPlatform,
    //projectName, projectVer, projectDate, releaseDir, gamer
 } from './build_base.js';

//console.log("Build", projectDir, '-', outDir, '-', buildPlatform);



class mglBundle extends mglBundleBase {
    totalFiles = 0;
    totalSize = 0;

    async makeBuild(){
        this.initBuild();

        const releaseDir = this.releaseDir;
        const gamer = this.gamer;

        // MyGL Core copy
        fs.mkdirSync(path.join(releaseDir, "mglcore"), { recursive: true });
        fs.copyFileSync(path.join("../", "mgl.core.js"), path.join(releaseDir, "mglcore", "mgl.core.js"));
        fs.copyFileSync(path.join("../", "mgl.package.js"), path.join(releaseDir, "mglcore", "mgl.package.js"));

        //Copy the $buildPlatform.build.js file to a new name build.js
        fs.copyFileSync(path.join("platform", buildPlatform + ".build.js"), path.join(releaseDir, "build.js"));

        // Replace the data in the file build.js
        this.replaceTextInFile(releaseDir + "/build.js", '"RPC_MGL_PROJECT"', '"' + this.projectName +'"');
        this.replaceTextInFile(releaseDir + "/build.js", '"RPC_MGL_BUILD"', `"${this.projectVer}(${this.projectDate}) [` + this.getCurrentDateTime() +']"')

        // Make clean html
        const buildPath = path.resolve(releaseDir, 'build.js');
        const { mglBuild } = this.loadCommonJS(buildPath);// await import(pathToFileURL(buildPath).href);
        let mglReq;
        //let mglBuild = require("./" + releaseDir + '/build.js').mglBuild;

        if(fs.existsSync("./" + releaseDir + '/package.js')){
            const file = path.resolve(releaseDir, 'package.js');
            //mglReq = await import(pathToFileURL(file).href);
            mglReq = this.loadCommonJS(file);
        } else {
            const file = path.resolve(releaseDir, 'mglcore/mgl.package.js');
            //mglReq = await import(pathToFileURL(file).href);
            mglReq = this.loadCommonJS(file);
        }

        mglReq.mglPackage.mglMain = gamer.build.main;
        mglReq.mglPackage.mglLibPath = './';
        mglReq.mglPackage.mglExtScripts = mglBuild.getSdkScripts();
        mglReq.mglPackage.mglExtScripts.push(
            { src: 'build.js', local: true, bundle_raw: true }
        );

        // mglReq.mglPackage.mglExtScripts.push(
        //     { code: '<script>const mglPackage = { mglLibPath: "./" };</script>' }
        // );

        fs.writeFileSync(releaseDir + "/mglcore/mgl.build.js", '', (err) => {});

        // Write clean html
        this.replacemglImportText(releaseDir + "/index.html", mglReq.mglPackage.makeCleanHtml());

        // Build. Minify css
        if (gamer.build.minify) {
            this.log("Minify... ");

            const files = this.getAllFiles(releaseDir);
            const jsFiles = files.filter(f => f.endsWith('.js'));
            const cssFiles = files.filter(f => f.endsWith('.css'));

            // esbuild options common to JS and CSS
            const buildOptions = {
                minify: gamer.build.minify,
                allowOverwrite: true,
                outdir: releaseDir, // Write the result back to the release folder
                outbase: releaseDir, // Preserve the subfolder hierarchy
                logLevel: 'error' // Output only errors
            };

            try {
                if (jsFiles.length > 0) {
                    await esbuild.build({
                        ...buildOptions,
                        entryPoints: jsFiles
                    });
                }

                if (cssFiles.length > 0) {
                    await esbuild.build({
                        ...buildOptions,
                        entryPoints: cssFiles
                    });
                }
            } catch (e) {
                console.error("Error during minification:", e.message);
            }
        }

        // Bundle
        if (gamer.build.bundle) {
            this.log("Done. Build bundle... ");

            // Read index.html
            const html = fs.readFileSync(path.join(releaseDir, 'index.html'), 'utf8');
            let scriptsToBundle = [], combinedRawCode = '';

            const plugin = (tree) => {
                tree.match({ tag: 'script' }, (node) => {
                    const attrs = node.attrs || {};
                    const src = attrs.src;
                    const isIgnored = 'bundle-ignore' in attrs;
                    const isRaw = 'bundle-raw' in attrs;

                    // Ignore external links and scripts with the ignore attribute
                    if (src && !src.startsWith('http') && !isIgnored && !isRaw) {
                        if(gamer.build.log == 'full')
                            console.log(`Bundle: ${src}`);

                        scriptsToBundle.push(path.join(releaseDir, src));
                        return null; // Remove the tag from HTML
                    }

                    if(isRaw){
                        const filePath = path.join(releaseDir, src);
                        combinedRawCode += fs.readFileSync(filePath, 'utf8');

                        if (gamer.build.delete){
                            fs.unlinkSync(filePath);

                            if(gamer.build.log == 'full')
                                console.log(`Delete bundle-raw: ${filePath}`);
                        }

                        return null;
                    }

                    return node;
                });
            };

            const { html: newHtml } = await posthtml([plugin]).process(html);

            // Combined code
            const combinedCode = scriptsToBundle
                .map(filePath => {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Удаляем старый файл, если включен флаг delete
                    if (gamer.build.delete && fs.existsSync(filePath)) {
                        if(gamer.build.log == 'full')
                            console.log(`Delete: ${filePath}`);
                        fs.unlinkSync(filePath);
                    }
                    return content;
                })
                .join('\n');

            // Run eshuild
            const result = await esbuild.build({
                stdin: {
                    contents: combinedCode,
                    resolveDir: path.resolve(releaseDir),
                    loader: 'js'
                },
                bundle: true,
                write: false,   // Don't save to disk, return to memory
                minify: gamer.build.minify,
                sourcemap: false,
                target: 'es6',
                format: 'esm',
                metafile: true  // Combines a map of all nested files
            });

            // Final code
            const finalCode = combinedRawCode + result.outputFiles[0].text;
            fs.writeFileSync(path.join(releaseDir, 'bundle.js'), finalCode);

            // Delete
            const importedFiles = Object.keys(result.metafile.inputs);

            if (gamer.build.delete)
                for (const relativePath of importedFiles) {
                    // Skip virtual stdin
                    if (relativePath === '<stdin>') continue;

                    // Skip node_modules (if any)
                    if (relativePath.includes('node_modules')) continue;

                    const fullPath = path.resolve(relativePath);
                    try {
                        fs.unlinkSync(fullPath);

                        if(gamer.build.log == 'full')
                            console.log(`Removed the nested import: ${relativePath}`);
                    } catch (e) {
                        console.error("Error: ", e);
                    }
                }

            // Insert the bundle back into the HTML before </body>
            const regex = /<div mgl_package="">([\s\S]*?)<\/div>/;
            let match = newHtml.match(regex);
            let finalHtml = 'FAIL!!!';

            if(match)
                finalHtml = match[1].replace(/^\s*[\r\n]/gm, '') + '  <script src="bundle.js" type="module"></script>';
            else
                console.error("Fail match!");

            finalHtml = newHtml.replace(/<div mgl_package="">([\s\S]*?)<\/div>/g, '<div mgl_package="">\r\n' + finalHtml + '\r\n</div>');

            // const finalHtml = newHtml
            // .replace(/^\s*[\r\n]/gm, '')
            // .replace('</body>', '<script src="bundle.js" type="module"></script></body>');
            fs.writeFileSync(path.join(releaseDir, 'index.html'), finalHtml);
        }

        this.makeZip();
    }

    // Helper for searching all files in a folder
    getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(file => {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        arrayOfFiles = this.getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
        arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });
    return arrayOfFiles;
    }
};

let bundle = new mglBundle();
await bundle.makeBuild();
