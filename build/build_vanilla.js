import esbuild from 'esbuild';
//import { minifyTemplates } from 'esbuild-minify-templates';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import posthtml from 'posthtml';
import { execSync } from 'child_process';

import { mglBundleBase,
    projectDir, outDir, buildPlatform,
    //projectName, projectVer, projectDate, releaseDir, gamer
 } from './build_base.js';
//import { mglPackage } from '../mgl.package.js';

//console.log("Build", projectDir, '-', outDir, '-', buildPlatform);

class mglBundle extends mglBundleBase {
    async makeBuild(){
        this.initBuild();

        const releaseDir = this.releaseDir;
        const gamer = this.gamer;

        // MyGL Core copy
        fs.mkdirSync(path.join(releaseDir, "mglcore"), { recursive: true });
        fs.copyFileSync(path.join("../", "mgl.core.js"), path.join(releaseDir, "mglcore", "mgl.core.js"));
        fs.copyFileSync(path.join("../", "mgl.package.js"), path.join(releaseDir, "mglcore", "mgl.package.js"));
        fs.copyFileSync(path.join("../", "mgl.gamer.js"), path.join(releaseDir, "mglcore", "mgl.gamer.js"));

        // Full mglcore
        //this.copyFilesSync(path.join(projectDir, "../mglcore-mini"), releaseDir + "/mglcore");
        //this.copyFilesSync(path.join(projectDir, "../extern"), releaseDir + "/extern");

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

        // Gamer scripts
        if(gamer.build.scripts)
            mglReq.mglPackage.mglExtScripts.push(... gamer.build.scripts);

        if(gamer.build.yandex_debugcheck){
            this.saveUrlToFileSync('https://raw.githubusercontent.com/Nioris/yandex-games-debug-checker/refs/heads/main/debugcheck.js', path.join(this.releaseDir, 'debugcheck.js'));
            mglReq.mglPackage.mglExtScripts.push({ src: 'debugcheck.js', local: true, bundle_ignore: true });
        }

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
                // if (jsFiles.length > 0) {
                //     await esbuild.build({
                //         ...buildOptions,
                //         entryPoints: jsFiles
                //     });
                // }

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
            let scriptsToBundle = [];
            let combinedRawCode = '';
            const rawScripts = [];

            const plugin = (tree) => {
                tree.match({ tag: 'script' }, (node) => {
                    const attrs = node.attrs || {};
                    const src = attrs.src;
                    const isIgnored = 'bundle-ignore' in attrs;
                    const isRaw = 'bundle-raw' in attrs;

                    if(!src)
                        return ;

                    //console.log(`index.html scipts: ${src}`, node);

                    // Ignore external links and scripts with the ignore attribute
                    if (src && !src.startsWith('http') && !isIgnored && !isRaw) {
                        if(gamer.build.log == 'full')
                            console.log(`Bundle: ${src}`);

                        scriptsToBundle.push(path.join(releaseDir, src));
                        return null; // Remove the tag from HTML
                    }

                    if(isRaw){
                        rawScripts.push(path.join(releaseDir, src));
                        return null;
                    }

                    return node;
                });
            };

            const { html: newHtml } = await posthtml([plugin]).process(html);

            // Read, minify, delete
            for (const filePath of rawScripts) {
                const code = this.readLocalFile(filePath);
                combinedRawCode += gamer.build.minify ? await this.minifyCode(code) : code;

                if (gamer.build.delete && this.isRealLocalFile(filePath)) {
                    fs.unlinkSync(filePath);

                    if (gamer.build.log == 'full')
                        console.log(`Delete bundle-raw: ${filePath}`);
                }
            }

            // Combined code
            let combinedCode = scriptsToBundle
                .map(filePath => {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // // Удаляем старый файл, если включен флаг delete
                    // if (gamer.build.delete && fs.existsSync(filePath)) {
                    //     if(gamer.build.log == 'full')
                    //         console.log(`Delete: ${filePath}`);
                    //     fs.unlinkSync(filePath);
                    // }

                    //return `import * from '${filePath}';`;
                    return content;
                })
                .join('\n');

            //combinedCode = `import `;

            // Glsl Plugin
            const glslPlugin = {
                name: 'glsl-minify-plugin',
                setup: (build) => {
                    build.onLoad({ filter: /\.(js|ts|mjs)$/ }, async (args) => {
                        if (args.path.includes('node_modules')) return;

                        const content = await fs.promises.readFile(args.path, 'utf8');
                        if (!content.includes('/* glsl */')) return;

                        return {
                            contents: this.minifyGlslInSource(content),
                            loader: args.path.endsWith('.ts') ? 'ts' : 'js'
                        };
                    });
                }
            };

            // Run eshuild
            const result = await esbuild.build({
                stdin: {
                    contents: `import './` + gamer.build.main + `';`,
                    //contents: `import './app.js';`,
                    resolveDir: path.resolve(releaseDir),
                    loader: 'js'
                },
                alias: {
                    //'mglcore': releaseDir + '/mglcore',
                    'mglcore': '../../mglcore-mini',
                    'three': '../../extern/three.module.js',
                    'three/addons': '../../extern/addons',
                    'cannon-es': releaseDir + '/extern/cannon-es.js',
                    'twgl': '../../extern/twgl-full.module.min.js',
                },
                plugins: [glslPlugin],
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
                        const releasePath = path.resolve(releaseDir);

                        if (fullPath.startsWith(releasePath + path.sep)) {
                        try {
                            fs.unlinkSync(fullPath);

                            if(gamer.build.log == 'full')
                                console.log(`Removed the nested import: ${relativePath}`);
                        } catch (e) {
                            console.error("Error: ", e);
                        }
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

    readLocalFile(filePath) {
        let modifiedPath = filePath.replace(this.releaseDir, '');

        if (/([/\\])mglcore([/\\])/i.test(modifiedPath)) {
            modifiedPath = modifiedPath.replace(/([/\\])mglcore([/\\])/i, '$1mglcore-mini$2');
            modifiedPath = path.join('../../..', modifiedPath);
        }

        const finalPath = path.join(this.releaseDir, modifiedPath);
        console.log("R", filePath, modifiedPath, finalPath);
        return fs.readFileSync(finalPath, 'utf8');
    }

    isRealLocalFile(filePath) {
        let modifiedPath = filePath.replace(this.releaseDir, '');

        if (/([/\\])mglcore([/\\])/i.test(modifiedPath)) {
            return false;
        }

        return true;
    }

    saveUrlToFileSync(url, savePath) {
        const buffer = execSync(`curl -sL "${url}"`);
        fs.writeFileSync(savePath, buffer);
    }

    async minifyCode(code) {
        try {
            const result = await esbuild.transform(code, {
                minify: true,
                loader: 'js', // Укажите 'ts', если код на TypeScript
                logLevel: 'error'
            });

            return result.code;
        } catch (error) {
            console.error('Ошибка минификации:', error);
            throw error;
        }
    }

   minifyGlsl(glsl) {
        // 1. Удаляем многострочные и однострочные комментарии GLSL
        let code = glsl
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n\r]*/g, '');

        const lines = code.split(/\r?\n/);
        const result = [];

        // 2. Обрабатываем построчно
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (line.startsWith('#')) {
                // Директивы (#define, #include <...>, #ifdef) не сжимаем агрессивно,
                // чтобы не сломать парсер Three.js и макросы
                result.push({ isDirective: true, text: line });
            } else {
                // Обычный код: удаляем лишние пробелы вокруг операторов и скобок
                let minified = line
                    .replace(/\s+/g, ' ')
                    .replace(/\s*([;{}(),=+\-*/%?:!~<>&|^\[\]])\s*/g, '$1');
                result.push({ isDirective: false, text: minified });
            }
        }

        // 3. Собираем обратно
        let output = '';
        for (const item of result) {
            if (item.isDirective) {
                if (output.length > 0 && !output.endsWith('\n')) {
                    output += '\n';
                }
                output += item.text + '\n';
            } else {
                if (
                    output.length > 0 &&
                    !output.endsWith('\n') &&
                    !/[;{}(),=+\-*/%?:!~<>&|^\[\]]$/.test(output) &&
                    !/^[;{}(),=+\-*/%?:!~<>&|^\[\]]/.test(item.text)
                ) {
                    output += ' ';
                }
                output += item.text;
            }
        }

        return output.trim();
    }

    // Поиск и замена всех блоков /* glsl */ `...` в JS коде
    minifyGlslInSource(source) {
        if (!source || !source.includes('/* glsl */')) return source;

        // Регулярное выражение ищет /* glsl */ перед строкой в обратных кавычках
        const glslRegex = /\/\*\s*glsl\s*\*\/[\s\r\n]*`((?:[^`\\]|\\.)*)`/g;

        // ВАЖНО: используем функцию в replace, чтобы не испортить знаки $ внутри строк
        return source.replace(glslRegex, (match, glslCode) => {
            return '`' + this.minifyGlsl(glslCode) + '`';
        });
    }

};

let bundle = new mglBundle();
await bundle.makeBuild();
