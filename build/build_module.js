import AdmZip from 'adm-zip';
import fs from 'fs';
import esbuild from 'esbuild';
import path from 'path';
import { pathToFileURL } from 'url';
//import * as archiver from 'archiver';
//const archiver = require('archiver');

const projectDir = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3]);
const buildPlatform = process.argv[4];

// Получаем параметры командной строки
//const args = process.argv;

// Input
//const projectDir = args[2]; // Укажите путь к каталогу проекта
//const buildPlatform = args[3]; // Укажите платформу, например, 'windows', 'linux' и т.д.
let buildType = undefined; //args[4];

// Build
let projectName = null;
let projectVer = null;
let projectDate;
let releaseDir;
let mglReq;
let gamer = {};

if (!projectDir || !outDir) {
  console.error("Usage: node build_vanila.js <from> <to>");
  process.exit(1);
}

class mglBundle{
    totalFiles = 0;
    totalSize = 0;

    constructor(/*projectDir, buildPlatform, buildType*/){
        if(!buildType)
            buildType = "bundle-mini"; // -mini
    }

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

        // // 4
        // // Копирование библиотек в папку проекта
        // copyFilesSync(projectDir + "/../extern", releaseDir + "/extern");
        // copyFilesSync(projectDir + "/../mglcore", releaseDir + "/mglcore");

        // MyGL Core copy
        fs.copyFileSync(path.join("../", "mgl.core.js"), path.join(releaseDir, "mglcore", "mgl.core.js"));
        fs.copyFileSync(path.join("../", "mgl.package.js"), path.join(releaseDir, "mglcore", "mgl.package.js"));

        //Copy the $buildPlatform.build.js file to a new name build.js
        fs.copyFileSync(path.join("platform", buildPlatform + ".build.js"), path.join(releaseDir, "build.js"));

        // Replace the data in the file build.js
        this.replaceTextInFile(releaseDir + "/build.js", '"RPC_MGL_PROJECT"', '"' + projectName +'"');
        this.replaceTextInFile(releaseDir + "/build.js", '"RPC_MGL_BUILD"', `"${projectVer}(${projectDate}) [` + this.getCurrentDateTime() +']"')

        // Make clean html
        const buildPath = path.resolve(releaseDir, 'build.js');
        const { mglBuild } = await import(pathToFileURL(buildPath).href);

        if (fs.existsSync("./" + releaseDir + '/package.js')) {
            const file = path.resolve(releaseDir, 'package.js');
            mglReq = await import(pathToFileURL(file).href);
        } else {
            const file = path.resolve(releaseDir, 'mglcore/mgl.package.js');
            mglReq = await import(pathToFileURL(file).href);
        }


// if(fs.existsSync("./" + releaseDir + '/package.js'))
//     mglReq = require("./" + releaseDir + '/package.js');
// else
//     mglReq = require("./" + releaseDir + '/mglcore/mgl.package.js');

mglReq.mglPackage.mglMain = gamer.build.main;
mglReq.mglPackage.mglLibPath = './';
mglReq.mglPackage.mglExtScripts = mglBuild.getSdkScripts();
mglReq.mglPackage.mglExtScripts.push(
    { src: 'build.js', local: true }
);

mglReq.mglPackage.mglExtScripts.push(
    { code: '<script>const mglPackage = { mglLibPath: "./" };</script>' }
);

//replacemglImportText(releaseDir + "/index.html", mglReq.mglPackage.makeCleanHtml());
//console.log(mglReq.mglPackage.makeCleanHtml());


//replaceTextInFile(releaseDir + "/index.html", 'const MGL_EXT_SCRIPTS = [];', 'const MGL_EXT_SCRIPTS = ' + JSON.stringify(extScripts) + ';')

// 8
// Стираем mglcore/mgl.build.js
fs.writeFile(releaseDir + "/mglcore/mgl.build.js", '', (err) => {});


// 9 - Make project
//const { build } = require('esbuild');

    if(buildType == "bundle" || buildType == "bundle-mini"){
        esbuild.build({
            entryPoints: [releaseDir + '/' + mglReq.mglPackage.mglMain],
            bundle: true,
            outfile: releaseDir + '/bundle.js',

            // Splitting
            //splitting: true, // РАЗРЕШАЕТ разделение на файлы
            //outdir: releaseDir + "/bundle",

            // Alias
            alias: {
                'mglcore': './' + releaseDir + '/mglcore',
                'three': './' + releaseDir + '/extern/three.module.js',
                'three/addons': './' + releaseDir + '/extern/addons/',
                'cannon-es' : './' + releaseDir + '/extern/cannon-es.js',
            },
            format: 'esm',
            pure: ['THREE'], // Помогает esbuild понять, что вызовы THREE не имеют побочных эффектов
            metafile: true,
            //target: ['es2020'],
            minify: gamer.build.minify,
            treeShaking: true,
            legalComments: 'none',
            define: {
                'process.env.NODE_ENV': '"production"', // Отключает дебаг-костыли в библиотеках
            },
            mainFields: ['module', 'main'],
        }).then((result) => {
            console.log('Bundle maked');
            mglReq.mglPackage.mglMain = "bundle.js";

            fs.writeFileSync(releaseDir + '/bundle.json', JSON.stringify(result.metafile, null, 2));

            this.makeBuildFinish();
        }).catch((error) => {
            console.error('Bundle error:', error);
        });
    }else {
        this.makeBuildFinish();
    }

}

    makeBuildFinish(){
        // 10 - Inject to html
        replacemglImportText(releaseDir + "/index.html", mglReq.mglPackage.makeCleanHtml());

        // 10 - Archiving the project
        //zipDirectory(releaseDir, 'release/' + projectName + '/' + projectName + '_' + projectVer + '_' + buildPlatform + '.zip');
        const zip = new AdmZip();
        zip.addLocalFolder(releaseDir);
        const zipPath = path.join(outDir, projectName, `${projectName}_${projectVer}_${buildPlatform}.zip`);
        zip.writeZip(zipPath);

        const zipStats = fs.statSync(zipPath);

        console.log("Build finished!");
        console.log('\r\n');

        console.log("-------------------------------------------------------");
        console.log(`[Files] Copied: ${this.totalFiles} pcs.`);
        console.log(`[Size] Initial weight: ${this.formatBytes(this.totalSize)}`);
        console.log(`[ZIP] Archive size: ${this.formatBytes(zipStats.size)}`);
        console.log("-------------------------------------------------------");
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
            if (this.ignoreMask && this.ignoreMask.test(item)) {
                //console.log("ignore", item);
                return;
            }

            // Check if the element is a directory
            if (fs.statSync(sourcePath).isDirectory()) {
                if (item == '.git' || item == '.vscode')
                    return;

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
}

// Functions
function copyFilesSync(sourceDir, targetDir) {
    // Проверяем, существует ли исходная директория
    if (!fs.existsSync(sourceDir)) {
        console.error(`Исходная директория не существует: ${sourceDir}`);
        return;
    }

    // Создаем целевую директорию, если она не существует
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Читаем содержимое исходной директории
    const items = fs.readdirSync(sourceDir);

    items.forEach(item => {
        const sourcePath = path.join(sourceDir, item);
        const targetPath = path.join(targetDir, item);

        // Проверяем, является ли элемент директорией
        if (fs.statSync(sourcePath).isDirectory()) {
            // Рекурсивно копируем вложенные директории
            //if(item != "tmp" && item != "temp")
            if (!/^(tmp|temp)/.test(item) && item != 'node_modules')
                copyFilesSync(sourcePath, targetPath);
        } else {
            // Копируем файл
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

function replacemglImportText(filePath, text){
    // Чтение содержимого файла
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Ошибка при чтении файла:', err);
            return;
        }

        // Регулярное выражение для поиска блока <script mgl_import>...</script>
        const regex = /<div mgl_package>[\s\S]*?<\/div>/g;

        // Замена найденного блока на новый текст
        const result = data.replace(regex, text);

        // Запись измененного содержимого обратно в файл
        fs.writeFile(filePath, result, 'utf8', (err) => {
            if (err) {
                console.error('Ошибка при записи файла:', err);
                return;
            }
            // console.log('Блок <script mgl_import> успешно заменен.');
        });
    });
}


function getCurrentDateTime() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

let bundle = new mglBundle();
await bundle.makeBuild();