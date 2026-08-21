import fs from 'fs/promises';
import fsp from 'fs/promises';
import path from 'path';

export async function mglCompressOneImage(_options = {}) {
    const options = {
        sharp: undefined,
        srcPath: '',
        dstPath: '',
        bitRate: 128,
        ..._options
    };

    if (!options.sharp) {
        throw new Error("❌ sharp not set!");
    }

    if (options.srcPath === options.dstPath) {
        throw new Error("options.srcPath == options.dstPath");
    }

    await fsp.access(options.srcPath);

    const metadata = await options.sharp(options.srcPath).metadata();
    const originalSize = `${metadata.width}x${metadata.height}`;

    let img = options.sharp(options.srcPath)
        .resize(options.bitRate, options.bitRate, {
            fit: 'inside',
            withoutEnlargement: true
        });

    if (options.dstPath.endsWith('.jpg') || options.dstPath.endsWith('.jpeg')) {
        img = img.flatten({ background: 'white' }).jpeg();
    }

    await img.toFile(options.dstPath);

    const newMetadata = await options.sharp(options.dstPath).metadata();
    const newSize = `${newMetadata.width}x${newMetadata.height}`;

    console.log(`✅ ${options.srcPath}: ${originalSize} → ${newSize}`);
}

export async function getFilesFromDir(dirPath, extensions) {
    try {
        const files = await fs.readdir(dirPath);
        // Фильтруем по расширению и возвращаем только имя файла
        return files.filter(file => extensions.includes(path.extname(file).toLowerCase()));
    } catch (error) {
        console.error(`Ошибка чтения папки "${dirPath}":`, error.message);
        return [];
    }
}