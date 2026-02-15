import fs from 'fs';
//import sharp from 'sharp';
//import { createCanvas, loadImage } from 'canvas';

export async function mglCompressImages(_options = {}){
    const options = {
        sharp: undefined,
        srcPath: '',
        dstPath: '',
        bitRate: 128,
        files: [],
        ... _options
    };

    let errors = 0;

    console.log("mglCompressImages():");

    if(!options.sharp){
        console.log("ERROR: sharp not set!");
        return ;
    }

    if(options.srcPath == options.dstPath){
        console.log("ERROR: options.srcPath == options.dstPath")
        return ;
    }

    for(const item of options.files){
        const srcPath = options.srcPath + item.file;
        const dstPath = options.dstPath + item.file;

        try {
            await fsp.access(srcPath);
        } catch {
            console.warn(`Not found → ${srcPath}`);
            errors ++;
            continue;
        }

        try {
            console.log(`🔄 Compress: ${srcPath} -> ${bitrate}px`);

            // Чтение метаданных для получения исходных размеров
            const metadata = await sharp(srcPath).metadata();
            const originalSize = `${metadata.width}x${metadata.height}`;

            // Обработка изображения
            await sharp(srcPath)
            .resize(bitrate, bitrate, {
                fit: 'inside',
                withoutEnlargement: true // Не увеличивать изображения меньше указанного размера
            })
            .toFile(dstPath);

            const newMetadata = await sharp(dstPath).metadata();
            const newSize = `${newMetadata.width}x${newMetadata.height}`;

            console.log(`✅ ${srcPath}: ${originalSize} → ${newSize}`);
            continue;

        } catch (error) {
            console.error(`❌ Error ${srcPath}:`, error.message);
            errors ++;
            continue;
        }
    }

    if(!errors)
        console.log("DONE.");
    else
        console.log("Errors: " + errors);
}


// Make pack
export async function mglPackImages(_options = {}){
    let options = {
        canvas: undefined,
        files: [],
        output: '',
        json: '',
        rows: 0,
        rate: 128,
        padding: 0,
        ..._options
    };

    console.log("mglPackImages():");

    if(!options.canvas){
        console.log("ERROR: canvas not set!");
        return ;
    }

    const createCanvas = options.canvas.createCanvas;
    const loadImage = options.canvas.loadImage;

    if(options.files.length == 0){
        console.log('packImages(): files length is null!');
        return ;
    }

    if(!options.output || !options.json){
        console.log('packImages(): output or json is null!');
        return ;
    }

    console.log('Files: ', options.files);

    // Загружаем изображения
    const images = await Promise.all(options.files.map(file => loadImage(file)));

    // Определяем размеры итогового холста
    if(!options.rows)
        options.rows = Math.ceil(Math.sqrt(images.length));

    const totalWidth = options.rows * options.rate;

    // Определяем высоту итогового холста
    const totalHeight = Math.ceil(images.length / options.rows) * (options.rate + options.padding) - options.padding;

    // Создаем холст
    const canvas = createCanvas(totalWidth, totalHeight);
    const ctx = canvas.getContext('2d');

    // Размещаем изображения на холсте
    images.forEach((img, index) => {
        const xOffset = (index % options.rows) * (options.rate + options.padding);
        const yOffset = Math.floor(index / options.rows) * (options.rate + options.padding);
        ctx.drawImage(img, xOffset, yOffset, options.rate, options.rate);
    });

    // Сохраняем итоговое изображение в формате PNG
    const buffer = canvas.toBuffer('image/png', {  }); // Укажите качество от 0 до 1
    fs.writeFileSync(options.output, buffer);
    console.log(`Изображение сохранено в ${options.output}`);

    // Создаем массив с названиями файлов и их номерами
    const filenames = options.files.map((file, index) => ({
        id: index,
        filename: file
    }));

    //filenames.push({});
    let results = {
        imageSize: [ totalWidth, totalHeight ],
        gridSize: [ options.rows, Math.ceil(images.length / options.rows) ],
        files: filenames
    };

    // Сохраняем массив в JSON файл
    fs.writeFileSync(options.json, JSON.stringify(results, null, 2));
    console.log(`Файлы сохранены в ${options.json}`);

    return ;
}