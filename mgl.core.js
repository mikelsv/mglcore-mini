// MSV Core Library functions for JavaScript. 2025.

// Vector2
class KiVec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Method for calculating the length of a vector
    length() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    // Method for vector normalization
    normalize() {
        const len = this.length();
        if (len === 0) return new KiVec2(0, 0); // Возвращаем нулевой вектор, если длина равна 0
        return new KiVec2(this.x / len, this.y / len);
    }

    // Method for adding two vectors
    add(vector) {
        return new KiVec2(this.x + vector.x, this.y + vector.y);
    }

    // Method for subtracting two vectors
    subtract(vector) {
        return new KiVec2(this.x - vector.x, this.y - vector.y);
    }

    // Method for multiplying a vector by a scalar
    multiply(scalar) {
        return new KiVec2(this.x * scalar, this.y * scalar);
    }

    // Method of truncating values ​​to specified boundaries
    crop(min, max){
        this.x = Math.max(min, Math.min(max, this.x));
        this.y = Math.max(min, Math.min(max, this.y));
    }

    empty(){
        return this.x == 0 && this.y == 0;
    }

    // Method to reset values ​​to zero
    reset(){
        this.x = 0;
        this.y = 0;
    }

    // Method to display a vector as a string
    toString() {
        return `KiVec2(${this.x}, ${this.y})`;
    }
}

class mglRandom{
    static randomInt(value){
        return Math.floor(Math.random() * value);
    }

    static randomInt2(min, max){
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

};

// Based on https://easings.net/
// Value from 0 to 1
class mglEasting{
    static easeInSine(x){
        return 1 - Math.cos((x * Math.PI) / 2);
    }

    static easeInOutQuad(x){
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }

    static easeInOutBack(x){
        const c1 = 1.70158;
        const c2 = c1 * 1.525;

        return x < 0.5
            ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
            : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
    }
};


class mglTweak{
    startTime = 0;
    endTime = 0;

    start(duration){
        this.startTime = Date.now();
        this.endTime = this.startTime + duration;
    }

    active(){
        return this.startTime != this.endTime;
    }

    value(){
        let time = Date.now();
        let delta = this.endTime - this.startTime;

        if(time > this.endTime)
            return 1;

        return (time - this.startTime) / (this.endTime - this.startTime);
    }

    is(time){
        return this.startTime <= time && time < this.endTime;
    }

    mix(from, to, val){
        // Make sure val is between 0 and 1
        val = Math.max(0, Math.min(1, val));

        // Return the mixed value
        return from + (to - from) * val;
    }

    end(){
        return this.endTime < Date.now();
    }

    stop(){
        this.endTime = this.startTime;
    }
};

class mglHtmlPage{
    constructor(){}

    setTitle(title, description){
        this.title = title;
        this.description = description;
        this.isCollapsed = false;

        this.createHtmlStructure();
        this.addStyles();
        this.addEventListeners();
    }

    createHtmlStructure() {
        // Создаем overlay (фон)
        this.overlay = document.createElement('div');
        this.overlay.className = 'mgl-html-page-overlay';

        // Создаем основное окно
        this.container = document.createElement('div');
        this.container.className = 'mgl-html-page-container';

        // Создаем заголовок
        this.header = document.createElement('div');
        this.header.className = 'mgl-html-page-header';
        this.header.textContent = this.title;

        // Создаем описание
        this.content = document.createElement('div');
        this.content.className = 'mgl-html-page-content';
        this.content.innerHTML = this.description;

        // Собираем структуру
        this.container.appendChild(this.header);
        this.container.appendChild(this.content);
        this.overlay.appendChild(this.container);

        // Добавляем в конец body
        document.body.appendChild(this.overlay);
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
      .mgl-html-page-overlay {
        position: fixed;
        top: 50px;
        left: 0;
        right: 0;
        bottom: 0;
        #background-color: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: start;
        z-index: 9999;
      }

      .mgl-html-page-container {
        font-family: Arial, sans-serif;
        border: 1px solid #ddd;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        background-color: white;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .mgl-html-page-header {
        background-color: #f5f5f5;
        padding: 15px 20px;
        cursor: pointer;
        font-weight: bold;
        font-size: 18px;
        border-bottom: 1px solid #ddd;
        user-select: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .mgl-html-page-header:hover {
        background-color: #e9e9e9;
      }

      .mgl-html-page-content {
        padding: 20px;
        background-color: white;
      }

      .mgl-html-page-container.collapsed {
        transform: translateY(-50px);
      }

      .mgl-html-page-container.collapsed .mgl-html-page-content {
        display: none;
      }

      .mgl-html-page-close {
        font-size: 24px;
        color: #888;
        cursor: pointer;
      }

      .mgl-html-page-close:hover {
        color: #333;
      }
    `;

        document.head.appendChild(style);
    }

  addEventListeners() {
    // Сворачивание/разворачивание по клику на заголовок
    this.header.addEventListener('click', (e) => {
      if (e.target.classList.contains('mgl-html-page-close')) return;

      this.isCollapsed = !this.isCollapsed;
      this.toggleCollapse();
    });

    // Закрытие по клику на overlay (вне окна)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
  }

  toggleCollapse() {
    if (this.isCollapsed) {
      this.container.classList.add('collapsed');
    } else {
      this.container.classList.remove('collapsed');
    }
  }

  close() {
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      this.overlay.remove();
    }, 300);
  }
}

class mglConsole {
    constructor(options = {}) {
        this.options = {
            maxLines: 10,
            title: 'Console>_',
            collapsed: true,
            init: true,
            ...options
        };

        this.lines = [];
        this.container = null;
        this.header = null;
        this.content = null;
        this.isInitialized = false;
        this.isCollapsed = options.collapsed;

        if(options.init)
            this.init();
    }

    init(){
        if(this.isInitialized)
            return;

        this.isInitialized = true;

        // Create a container
        this.container = document.createElement('div');
        this.container.className = 'mglConsoleContainer';

        // Create a title
        this.header = document.createElement('div');
        this.header.className = 'mglConsoleHeader';
        this.header.textContent = this.options.title;

        // Create a content area
        this.content = document.createElement('div');
        this.content.className = 'mglConsoleContent';

        // Add elements to the container
        this.container.appendChild(this.header);
        this.container.appendChild(this.content);

        // Add the container to the body
        document.body.appendChild(this.container);

        // Apply styles
        this.applyStyles();

        // Add event handlers
        this.header.addEventListener('click', () => this.toggle());

        // Set the initial state
        this.collapse(this.options.collapsed);
    }

    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mglConsoleContainer {
                position: fixed;
                bottom: 10px;
                left: 10px;
                background-color: rgba(0, 0, 0, 0.7);
                color: white;
                font-family: monospace;
                font-size: 14px;
                border-radius: 5px;
                overflow: hidden;
                z-index: 10000;
                transition: width 0.3s ease, max-height 0.3s ease;
            }

            .mglConsoleHeader {
                padding: 8px 12px;
                background-color: rgba(0, 0, 0, 0.8);
                cursor: pointer;
                user-select: none;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .mglConsoleHeader:hover {
                background-color: rgba(50, 50, 50, 0.8);
            }

            .mglConsoleContent {
                max-height: 300px;
                overflow-y: auto;
                padding: 5px;
                transition: max-height 0.3s ease;
            }

            .mglConsoleContent.collapsed {
                width: 100px;
                max-height: 0;
                padding: 0;
            }

            .mglConsoleLine {
                word-break: break-word;
                border-color: #d6d8db;
                margin-bottom: .1rem;
                padding: .2rem 1.00rem;
                border: 1px solid #b8bfb7ba;
                border-radius: .25rem;
            }
        `;
        document.head.appendChild(style);
    }

    log(...args){
        this.pushLog('log', ...args);

        console.log(...args);
    }

    warn(...args){
        this.pushLog('warning', ...args);

        console.warn(...args);
    }

    error(...args){
        this.pushLog('error', ...args);

        console.error(...args);
    }

    pushLog(type, ...args){
        if (!this.isInitialized)
            return ;

        // Format arguments as console.log
        const line = args.map(arg => {
            if (typeof arg === 'object'){
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        // Add a new line
        this.lines.push(line);

        // Limit the number of lines
        if (this.lines.length > this.options.maxLines){
            this.lines.shift();
        }

        // Adding a new element
        const logEntry = document.createElement('div');
        logEntry.className = 'mglConsoleLine';
        logEntry.textContent = line;
        this.content.appendChild(logEntry);

        // Delete old lines if the maximum number is exceeded
        if (this.content.children.length > this.options.maxLines){
            this.content.removeChild(this.content.children[0]);
        }

        // Scroll down to show the latest log
        if(!this.isCollapsed)
            this.content.scrollTop = this.content.scrollHeight;
    }

    updateContent_DELETE(){
        if (!this.isInitialized) return;

        this.content.innerHTML = '';

        this.lines.forEach(line => {
            const lineElement = document.createElement('div');
            lineElement.className = 'mglConsoleLine';
            lineElement.textContent = line;
            this.content.appendChild(lineElement);
        });

        this.content.scrollTop = this.content.scrollHeight;
    }

    toggle(){
        this.collapse(!this.isCollapsed);
        //this.collapse(!this.content.classList.contains('collapsed'));
    }

    collapse(value = 1){
        if(!this.isInitialized)
            return;

        this.isCollapsed = value;

        if(value)
            this.content.classList.add('collapsed');
        else
            this.content.classList.remove('collapsed');
    }

    clear(){
        this.lines = [];
        this.updateContent();
    }
};

class mglDebug {
    constructor({ debugOn = false, files = [], setDebugMode = undefined } = {}) {
        this.debugOn = debugOn;
        this.files = files;
        this.setDebugMode = setDebugMode;

        this.tapCount = 0;
        this.lastTapTime = 0;
        this.tapTimeout = 400;

        this.overlay = null;

        this._bindPointer();
        this._createOverlay();
    }

    /* =========================
       INPUT
    ========================= */

    _bindPointer() {
        window.addEventListener("pointerdown", (e) => {
            if (!this._isInCorner(e.clientX, e.clientY)) return;

            const now = performance.now();

            if (now - this.lastTapTime < this.tapTimeout) {
                this.tapCount++;
            } else {
                this.tapCount = 1;
            }

            this.lastTapTime = now;

            if (this.tapCount >= 5) {
                this.show();
                this.tapCount = 0;
            }
        });
    }

    _isInCorner(x, y) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const zone = 80;

        return (
            (x < zone && y < zone) ||                 // top-left
            (x > w - zone && y < zone) ||             // top-right
            (x < zone && y > h - zone) ||             // bottom-left
            (x > w - zone && y > h - zone)             // bottom-right
        );
    }

    /* =========================
       UI
    ========================= */

    _createOverlay() {
        const root = document.createElement("div");
        // root.style.cssText = `
        //     position: fixed;
        //     inset: 0;
        //     background: rgba(0,0,0,0.75);
        //     color: #fff;
        //     font-family: monospace;
        //     z-index: 99999;
        //     display: none;
        //     overflow: auto;
        // `;

        root.style.cssText = `
            position: fixed;
            inset: 0;
            background: linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(26,26,46,0.9) 100%);
            color: #f0f0f0;
            font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
            z-index: 2147483647;
            display: none;
            overflow: auto;
            backdrop-filter: blur(10px);
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: text;
        `;

        const panel = document.createElement("div");
        // panel.style.cssText = `
        //     background: #111;
        //     margin: 40px auto;
        //     padding: 16px;
        //     max-width: 900px;
        //     border: 1px solid #444;
        // `;

        panel.style.cssText = `
            background: linear-gradient(145deg, rgba(18,18,28,0.95) 0%, rgba(30,30,40,0.98) 100%);
            margin: 20px auto;
            padding: 32px;
            max-width: 800px;
            min-width: 320px;
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow:
                0 20px 60px rgba(0,0,0,0.3),
                0 0 0 1px rgba(255,255,255,0.05),
                inset 0 1px 0 rgba(255,255,255,0.1);
            transform: translateY(20px);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        `;

        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>mglDebug</strong>
                <button data-close>✕</button>
            </div>

            <div style="margin:12px 0;">
                <button data-toggle></button>
            </div>

            <h3>Files</h3>
            <div data-files></div>

            <h3>File Types</h3>
            <div data-types></div>
        `;

        root.appendChild(panel);
        document.body.appendChild(root);

        root.querySelector("[data-close]").onclick = () => this.hide();
        root.querySelector("[data-toggle]").onclick = () => this.toggleDebug();

        this.overlay = root;
        this._render();
    }

    show() {
        this._render();
        this.overlay.style.display = "block";
    }

    hide() {
        this.overlay.style.display = "none";
    }

    toggleDebug(){
        this.debugOn = !this.debugOn;
        this.setDebugMode?.(this.debugOn);
        this._render();
    }

    /* =========================
       RENDER
    ========================= */

    _render() {
        this._renderToggle();
        this._renderFiles();
        this._renderTypes();
    }

    _renderToggle() {
        const btn = this.overlay.querySelector("[data-toggle]");
        btn.textContent = this.debugOn
            ? "Disable Debug"
            : "Enable Debug";
    }

    _renderFiles() {
        const container = this.overlay.querySelector("[data-files]");
        container.innerHTML = this._makeTable(
            ["File", "Size (KB)"],
            this.files.map(f => [
                f.url,
                (f.size / 1024).toFixed(2)
            ])
        );
    }

    _renderTypes() {
        const stats = {};

        for (const f of this.files) {
            const type = f.url.split(".").pop().toLowerCase();
            if (!stats[type]) {
                stats[type] = { count: 0, size: 0 };
            }
            stats[type].count++;
            stats[type].size += f.size;
        }

        const rows = Object.entries(stats).map(
            ([type, data]) => [
                type,
                data.count,
                (data.size / 1024).toFixed(2)
            ]
        );

        const container = this.overlay.querySelector("[data-types]");
        container.innerHTML = this._makeTable(
            ["Type", "Count", "Total Size (KB)"],
            rows
        );
    }

    _makeTable(headers, rows) {
        const th = headers.map(h => `<th>${h}</th>`).join("");
        const tr = rows.map(
            r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`
        ).join("");

        return `
            <table border="1" cellspacing="0" cellpadding="4">
                <thead><tr>${th}</tr></thead>
                <tbody>${tr}</tbody>
            </table>
        `;
    }
}
