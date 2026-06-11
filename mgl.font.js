import * as THREE from 'three';

export class mglFontTextureGen{
    constructor(_options = {}){
        let options = {
            fontName: 'Times New Romain',
            fontWeight: '',
            fontSize: 64,
            padding: 4,
            chars: '0123456789.,!?:;-_+=*/@#$%&()[]{}"\' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
            //chars: '012345',
            ..._options,
        };

        // Canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Font data
        this.fontName = options.fontName;
        this.fontWeight = options.fontWeight;
        this.fontSize = options.fontSize;
        this.padding = options.padding;
        this.chars = options.chars;

        // Map
        this.charData = new Map();

        this.#generateTexture();
    }

    #generateTexture2(){
        let canvas = this.canvas;
        let ctx = this.ctx;

        // Рисуем алфавит
        const symbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-'];

        // Размер атласа: 12 символов по горизонтали
        const atlasWidth = symbols.length * 100;
        const atlasHeight = 100;
        canvas.width = atlasWidth;
        canvas.height = atlasHeight;

        // Белый фон с прозрачностью
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, atlasWidth, atlasHeight);

        // Стиль для цифр
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const digitWidth = atlasWidth / symbols.length;
        for (let i = 0; i < symbols.length; i++) {
            const x = i * digitWidth + digitWidth / 2;
            const y = atlasHeight / 2;

            // Добавляем чёрную обводку для лучшей видимости
            ctx.strokeStyle = '#0000ff';
            ctx.lineWidth = 4+1;
            ctx.strokeText(symbols[i], x, y);

            // Белая заливка
            ctx.fillStyle = '#ffffff';
            ctx.fillText(symbols[i], x, y);
        }


        const texture = this.texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

    }

    #generateTexture(){
        //this.ctx.font = '80px Arial';
        this.ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontName}`;
        this.ctx.textBaseline = 'top';

        // Calculate the sizes for each character
        const charWidths = [];
        let totalWidth = 0;

        for (let char of this.chars){
            const metrics = this.ctx.measureText(char);
            const width = Math.ceil(metrics.width) + this.padding * 2;
            charWidths.push(width);
            totalWidth += width;
        }

        // Determine the texture size (square power of 2)
        const charsPerRow = Math.ceil(Math.sqrt(this.chars.length));
        const maxCharWidth = Math.max(...charWidths);
        let cellSize = maxCharWidth;
        const textureSize = Math.pow(2, Math.ceil(Math.log2(cellSize * charsPerRow)));
        this.size = textureSize;
        this.rows = charsPerRow;

        this.canvas.width = textureSize;
        this.canvas.height = textureSize;

        console.log("Texture", textureSize, cellSize);
        cellSize = textureSize / charsPerRow;

        // Clear
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        this.ctx.fillRect(0, 0, textureSize, textureSize);

        //this.ctx.fillStyle = 'rgba(255, 0, 0, 1)';
        //this.ctx.fillRect(textureSize / 2, 0, textureSize / 2, textureSize);

        // Draw symbols
        //this.ctx.font = `${this.fontSize}px Arial`;
        this.ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontName}`;
        //this.ctx.textBaseline = 'top';
        //this.ctx.fillStyle = 'white';
        //this.ctx.font = '80px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = 'rgba(255, 0, 0, 255)';

        let x = 0;
        let y = 0;
        let maxHeight = 0;

        for (let i = 0; i < this.chars.length; i++){
            const char = this.chars[i];
            const width = charWidths[i];

            // Go to a new line
            if (x + cellSize > textureSize){
                x = 0;
                y += cellSize;
            }

            // Draw the symbol
            //this.ctx.fillText(char, x + this.padding, y + this.padding);
            const cx = x + cellSize / 2; //i * digitWidth + digitWidth / 2;
            const cy = y + cellSize / 2; //atlasHeight / 2;

            //this.ctx.fillStyle = 'rgba(0, 128, 0, 1)';
            //this.ctx.fillRect(cx - 1, cy - 1, cellSize / 2, cellSize / 2);

            // Добавляем чёрную обводку для лучшей видимости
            this.ctx.strokeStyle = '#0000ff';
            this.ctx.lineWidth = 4 + 1;
            this.ctx.strokeText(char, cx, cy);

            // Белая заливка
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(char, cx, cy);

            // Save the character position data
            this.charData.set(char, {
                x: x / textureSize,
                y: y / textureSize,
                width: width / textureSize,
                height: cellSize / textureSize,
                pixelWidth: width,
                pixelHeight: cellSize
            });

            x += cellSize;
        }

        // Create a Three.js texture
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.wrapS = THREE.ClampToEdgeWrapping;
        this.texture.wrapT = THREE.ClampToEdgeWrapping;

        this.texture.needsUpdate = true;


        console.log("TEXT", this, this.texture);

        // Clear
        // if (this.canvas){
        //     this.canvas.width = 0;
        //     this.canvas.height = 0;
        //     this.ctx = null;
        //     this.canvas = null;
        // }
    }

    getTexture(){
        return this.texture;
    }

    getTextureSize(){
        return this.size;
    }

    getRowsSize(){
        return this.rows;
    }

    getCharIndices(text){
        const indices = new Float32Array(text.length);

        for (let i = 0; i < text.length; i++){
            const char = text[i];
            const charIndex = this.chars.indexOf(char);

            if (charIndex === -1){
                console.warn(`The character "${char}" was not found in the character set. Replaced with a space.`);
                indices[i] = this.chars.indexOf(' ');
            } else
                indices[i] = charIndex;
        }

        return indices;
    }
};

export const mglTextSprite = {
    createTextSpriteAspect4(text, options = {}) {
        const {
            width = 512,
            height = 128,
            font = '700 64px Arial',
            color = '#f5f8ff',
            strokeColor = '#1a1f33',
            strokeWidth = 8,
            scaleX = 3.6,
            scaleY = 0.65,
            preserveAspect = true
        } = options;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, width, height);
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';

        if (strokeWidth > 0) {
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.strokeText(text, width * 0.5, height * 0.52);
        }

        ctx.fillStyle = color;
        ctx.fillText(text, width * 0.5, height * 0.52);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        return texture;
    },

    createTextSpriteExt(text, options = {}) {
        const {
            fontSize = 64,
            fontFamily = 'Arial',
            fontWeight = '700',
            color = '#f5f8ff',
            strokeColor = '#1a1f33',
            strokeWidth = 8,
            padding = 20 // Отступы, чтобы края не обрезались
        } = options;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const font = `${fontWeight} ${fontSize}px ${fontFamily}`;

        ctx.font = font;

        // 1. Измеряем текст для динамического размера холста
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize; // Приблизительная высота для базовой линии

        canvas.width = textWidth + padding * 2;
        canvas.height = textHeight + padding * 2;

        // 2. Отрисовка (после изменения размера холста контекст сбрасывается)
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (strokeWidth > 0) {
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.strokeText(text, centerX, centerY);
        }

        ctx.fillStyle = color;
        ctx.fillText(text, centerX, centerY);

        // 3. Создание текстуры
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        // 4. Расчет правильного соотношения сторон для спрайта/плоскости
        const aspect = canvas.width / canvas.height;

        // Возвращаем объект, чтобы в шейдер передать и текстуру, и аспект
        return {
            texture,
            aspect,
            width: canvas.width,
            height: canvas.height
        };
    }


};