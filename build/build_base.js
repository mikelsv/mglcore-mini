import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const projectDir = path.resolve(process.argv[2]);
export const outDir = path.resolve(process.argv[3]);
export const buildPlatform = process.argv[4];

if (!projectDir || !outDir) {
  console.error("Usage: node build_vanila.js <from> <to>");
  process.exit(1);
}

export class mglBundleBase {
    constructor(){
        this.projectName = null;
        this.projectVer = null;
        this.projectDate = null;
        this.releaseDir = null;
    }

    initBuild(){
        // Read gamer
        const gamerData = fs.readFileSync(path.join(projectDir, 'gamer.js'), 'utf8');
        let gamer = {};
        eval(gamerData);

        // Project data
        this.projectName = gamer.projectName;
        this.projectVer = gamer.projectVers[0][0];
        this.projectDate = gamer.projectVers[0][1];
        this.gamer = gamer;

        // Hello
        console.log("##### Build for", this.projectName, " - ", this.projectVer, " - ", buildPlatform, "#####");

        // Release dir: $buildName/ver
        this.releaseDir = path.join(outDir, this.projectName, this.projectVer)

        fs.mkdirSync(this.releaseDir, { recursive: true });

        // Ignore mask
        if (gamer.build?.ignoreFiles) {
            const masks = gamer.build.ignoreFiles.split(',').map(s => s.trim());

            // Turn each mask into a valid Regex pattern
            const patterns = masks.map(m => {
                return m
                    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape anything that might break RegExp
                    .replace(/\*/g, '.*');               // Convert the asterisk to "any characters"
            });

            // Combine them into a single RegExp using | (OR)
            this.ignoreMask = new RegExp(`^(${patterns.join('|')})$`, 'i');
        }

        // Copy all files from projectDir to releaseDir
        this.copyFilesSync(projectDir, this.releaseDir);
    }

    makeZip(){
        this.log("Done. Achiving... ");

        const zip = new AdmZip();
        zip.addLocalFolder(this.releaseDir);
        const zipPath = path.join(outDir, this.projectName, `${this.projectName}_${this.projectVer}_${buildPlatform}.zip`);
        zip.writeZip(zipPath);

        const zipStats = fs.statSync(zipPath);

        console.log("Build finished!");
        //console.log('\r\n');

        console.log("-------------------------------------------------------");
        console.log(`[Files] Copied: ${this.totalFiles} pcs.`);
        console.log(`[Size] Initial weight: ${this.formatBytes(this.totalSize)}`);
        console.log(`[ZIP] Archive size: ${this.formatBytes(zipStats.size)}`);
        console.log("-------------------------------------------------------");
    }

    loadCommonJS(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const dummyModule = { exports: {} };

        // Execute the code in isolation, passing it artificial module and exports
        const fn = new Function('module', 'exports', content);
        fn(dummyModule, dummyModule.exports);
        return dummyModule.exports;
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
        try {
            const data = fs.readFileSync(filePath, 'utf8');

            const indentedText = text
                .replace(/\r?\n$/, '')
                .split(/\r?\n/)
                .map(line => '  ' + line)
                .join('\n');

            const regex = /<div mgl_package>[\s\S]*?<\/div>/g;
            const result = data.replace(regex, '\r\n<div mgl_package>\r\n' + indentedText + '\r\n</div>\r\n');

            fs.writeFileSync(filePath, result, 'utf8');

            //console.log('File successfully updated:', filePath);
        } catch (err) {
            console.error('Error processing file:', err);
        }
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