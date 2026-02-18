import AdmZip from 'adm-zip';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const projectDir = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3]);
const buildPlatform = process.argv[4];

let projectName = null;
let projectVer = null;
let projectDate;
let releaseDir;
let gamer = {};

//console.log("Build", projectDir, '-', outDir, '-', buildPlatform);

if (!projectDir || !outDir) {
  console.error("Usage: node build_vanila.js <from> <to>");
  process.exit(1);
}

class mglBundle {
    totalFiles = 0;
    totalSize = 0;

    async makeBuild(){
        // Read gamer
        const gamerData = fs.readFileSync(path.join(projectDir, 'gamer.js'), 'utf8');
        eval(gamerData);

        projectName = gamer.projectName;
        projectVer = gamer.projectVers[0][0];
        projectDate = gamer.projectVers[0][1];

        console.log("### Build for", projectName, " - ", projectVer, " - ", buildPlatform);

        // Make release folder: $buildName/ver
        releaseDir = path.join(outDir, projectName, projectVer)
        fs.mkdirSync(releaseDir, { recursive: true });

        // Ignore mask
        if(gamer.build?.ignoreFiles){
            const masks = gamer.build.ignoreFiles.split(',').map(s => s.trim());

            // const regexSource = gamer.build.ignoreFiles
            //     .replace(/\./g, '\\.')
            //     .replace(/\*/g, '.*');

            // this.ignoreMask = new RegExp(`^${regexSource}$`, 'i');

            // 2. Превращаем каждую маску в валидный Regex-паттерн
            const patterns = masks.map(m => {
                return m
                    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Экранируем всё, что может сломать RegExp
                    .replace(/\*/g, '.*');               // Звездочку превращаем в "любые символы"
            });

            // 3. Собираем в один RegExp через | (ИЛИ)
            this.ignoreMask = new RegExp(`^(${patterns.join('|')})$`, 'i');
        }

        // Copy all files from projectDir to releaseDir
        this.copyFilesSync(projectDir, releaseDir);

        //Copy the $buildPlatform.build.js file to a new name build.js
        fs.copyFileSync(path.join("platform", buildPlatform + ".build.js"), path.join(releaseDir, "build.js"));

        // Replace the data in the file build.js
        this.replaceTextInFile(releaseDir + "/build.js", '"RPC_MGL_PROJECT"', '"' + projectName +'"');
        this.replaceTextInFile(releaseDir + "/build.js", '"RPC_MGL_BUILD"', `"${projectVer}(${projectDate})` + this.getCurrentDateTime() +'"')

        // Make clean html
        const buildPath = path.resolve(releaseDir, 'build.js');
        const { mglBuild } = await import(pathToFileURL(buildPath).href);
        let mglReq;
        //let mglBuild = require("./" + releaseDir + '/build.js').mglBuild;

        if(fs.existsSync("./" + releaseDir + '/package.js')){
            const file = path.resolve(releaseDir, 'package.js');
            mglReq = await import(pathToFileURL(file).href);
        } else {
            const file = path.resolve(releaseDir, 'mglcore/mgl.package.js');
            mglReq = await import(pathToFileURL(file).href);
        }

        mglReq.mglPackage.mglLibPath = './';
        mglReq.mglPackage.mglExtScripts = mglBuild.getSdkScripts();
        mglReq.mglPackage.mglExtScripts.push(
            { src: 'build.js', local: true }
        );

        mglReq.mglPackage.mglExtScripts.push(
            { code: '<script>const mglPackage = { mglLibPath: "./" };</script>' }
        );

        fs.writeFile(releaseDir + "/mglcore/mgl.build.js", '', (err) => {});

        // Write clean html
        this.replacemglImportText(releaseDir + "/index.html", mglReq.mglPackage.makeCleanHtml());

        // Build
        const files = this.getAllFiles(releaseDir);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        const cssFiles = files.filter(f => f.endsWith('.css'));

        this.log("Make bundle... ");

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

        // await Promise.all([
        //     ...jsFiles.map(file => esbuild.build({
        //     entryPoints: [file],
        //     minify: true,
        //     allowOverwrite: true,
        //     outfile: file,
        //     })),

        //     ...cssFiles.map(file => esbuild.build({
        //     entryPoints: [file],
        //     minify: true,
        //     allowOverwrite: true,
        //     outfile: file,
        //     }))
        // ]);

        this.log("Done. Achiving... ");

        //this.makeArchive(releaseDir, 'release/' + projectName + '/' + projectName + '_' + projectVer + '_' + buildPlatform + '.zip');
        const zip = new AdmZip();
        zip.addLocalFolder(releaseDir);

        const zipPath = path.join(outDir, projectName, `${projectName}_${projectVer}_${buildPlatform}.zip`);
        zip.writeZip(zipPath);

        const zipStats = fs.statSync(zipPath);

        this.log("Build finished!");
        this.log('\r\n');

        console.log("-------------------------------------------------------");
        console.log(`[Files] Copied: ${this.totalFiles} pcs.`);
        console.log(`[Size] Initial weight: ${this.formatBytes(this.totalSize)}`);
        console.log(`[ZIP] Archive size: ${this.formatBytes(zipStats.size)}`);
        console.log("-------------------------------------------------------");
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

    copyFilesSync(sourceDir, targetDir) {
        // Check if the source directory exists
        if (!fs.existsSync(sourceDir)) {
            console.error(`Исходная директория не существует: ${sourceDir}`);
            return;
        }

        // Create the target directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Read the contents of the source directory
        const items = fs.readdirSync(sourceDir);

        items.forEach(item => {
            const sourcePath = path.join(sourceDir, item);
            const targetPath = path.join(targetDir, item);

            // Apply a mask to ignore files
            if(this.ignoreMask && this.ignoreMask.test(item)){
                //console.log("ignore", item);
                return ;
            }

            // Check if the element is a directory
            if (fs.statSync(sourcePath).isDirectory()) {
                if(item == '.git' || item == '.vscode')
                    return ;

                //if(item != "tmp" && item != "temp")
                if (!/^(tmp|temp)/.test(item))
                    // Recursively copy nested directories
                    this.copyFilesSync(sourcePath, targetPath);
            } else {
                const stats = fs.statSync(sourcePath);
                this.totalFiles++;
                this.totalSize += stats.size;

                fs.copyFileSync(sourcePath, targetPath);
            }
        });
    }

    replaceTextInFile(filePath, searchValue, replaceValue) {
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            console.error(`File does not exist: ${filePath}`);
            return;
        }

        // Read the file contents
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Replace the text
        const updatedContent = fileContent.replace(searchValue, replaceValue);

        // Write the updated contents back to the file
        fs.writeFileSync(filePath, updatedContent, 'utf8');
    }

    replacemglImportText(filePath, text) {
        // Read file contents
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }

            // Regular expression for searching for the <script mgl_import>...</script> block
            const regex = /<div mgl_package>[\s\S]*?<\/div>/g;

            // Replace the found block with new text
            const result = data.replace(regex, text);

            // Write the changed contents back to the file
            fs.writeFile(filePath, result, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                    return;
                }
            });
        });
    }

    getCurrentDateTime() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Months start with 0
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    log(text) {
        process.stdout.write(String(text));
    }
};

let bundle = new mglBundle();
await bundle.makeBuild();
