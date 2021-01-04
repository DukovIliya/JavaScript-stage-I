"use strict";

const settings = {
    rowsCount: 21,
    colsCount: 21,
    speed: 2,
    winFoodCount: 50,
    wallCoordinates: [ //координаты препятствий
        { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 },
        { x: 18, y: 17 }, { x: 17, y: 17 }, { x: 16, y: 17 }, { x: 15, y: 17 }, { x: 18, y: 16 }, { x: 18, y: 15 }, { x: 18, y: 14 }
    ],
    noLimits: true, // Убрать границы поля. Т.е. при пересечении границы поля змейка появляется с противоположной стороны.
};

const config = {
    settings,
    init(userSettings) {
        Object.assign(this.settings, userSettings);
    },

    getRowsCount() {
        return this.settings.rowsCount;
    },

    getColsCount() {
        return this.settings.colsCount;
    },

    getSpeed() {
        return this.settings.speed;
    },

    getWinFoodCount() {
        return this.settings.winFoodCount;
    },
    getWallCoordinates() {
        return this.settings.wallCoordinates;
    },
    getNoLimits() {
        return this.settings.noLimits;
    },
    setNoLimits(value) {
        if (typeof (value) == 'boolean')
            this.settings.noLimits = value;
    },


    validate() {//проверка входящих настроек
        const result = {
            isValid: true,
            errors: [],
        };

        if (this.getRowsCount() < 10 || this.getRowsCount() > 30) {
            result.isValid = false;
            result.errors.push('Неверные настройки, значение rowsCount должно быть в диапазоне [10, 30].');
        }

        if (this.getColsCount() < 10 || this.getColsCount() > 30) {
            result.isValid = false;
            result.errors.push('Неверные настройки, значение colsCount должно быть в диапазоне [10, 30].');
        }

        if (this.getSpeed() < 1 || this.getSpeed() > 10) {
            result.isValid = false;
            result.errors.push('Неверные настройки, значение speed должно быть в диапазоне [1, 10].');
        }

        if (this.getWinFoodCount() < 5 || this.getWinFoodCount() > 50) {
            result.isValid = false;
            result.errors.push('Неверные настройки, значение winFoodCount должно быть в диапазоне [5, 50].');
        }

        for (let maxPointWall of this.getWallCoordinates())
            if (maxPointWall.x > this.getColsCount() - 1 || maxPointWall.y > this.getRowsCount() - 1) {
                result.isValid = false;
                result.errors.push('Неверные настройки, значения wallCoordinates не должны превышать rowsCount и colsCount');
            }

        return result;
    },
};

const map = { //карта
    cells: null, // {x0_y0: td, x0_y1: td, ..., xN_yN: td}
    usedCells: [],//использованные ячейки

    init(rowsCount, colsCount) {//карта принимает кол-во колонок и столбцов
        const table = document.getElementById('game');
        table.innerHTML = '';//обнуляем карту

        this.cells = {};
        this.usedCells = [];//обнуляем массивы и объекты

        for (let row = 0; row < rowsCount; row++) {//генерация карты
            const tr = document.createElement('tr');
            tr.classList.add('row');
            table.appendChild(tr);

            for (let col = 0; col < colsCount; col++) {
                const td = document.createElement('td');
                td.classList.add('cell');

                this.cells[`x${col}_y${row}`] = td;//сохраняем ссылку на ячейку в объект с привязкой к координатам
                tr.appendChild(td);
            }
        }
    },

    render(snakePointsArray, foodPoint, wallPointsArray) {//отрисовка всего. На входе массив точек змейки,точка еды и стена

        for (const cell of this.usedCells) {//перерисовка разметки не делается, а просто проставляет один класс cell, очищая змейку и еду.
            cell.className = 'cell';
        }

        this.usedCells = []; //сбрасываем все занятые ячейки

        snakePointsArray.forEach((point, index) => { //рисуем змейку
            const snakeCell = this.cells[`x${point.x}_y${point.y}`];
            snakeCell.classList.add(index === 0 ? 'snakeHead' : 'snakeBody');
            this.usedCells.push(snakeCell); //заполняем массив занятых ячеек
        });

        const foodCell = this.cells[`x${foodPoint.x}_y${foodPoint.y}`]; //рисуем еду
        foodCell.classList.add('food');
        this.usedCells.push(foodCell);

        //рисуем стену
        wallPointsArray.forEach((point) => {
            const wallCell = this.cells[`x${point.x}_y${point.y}`];
            wallCell.classList.add('wall');
            this.usedCells.push(wallCell);
        });
    },
};

const snake = {//объект змея
    body: [], //массив точек
    direction: null,//направление
    lastStepDirection: null,//предыдущее напрвление змейки, будет провека чтобы змейку не развернуть на 180 градусов
    config,

    init(startBody, direction) { //установка змейки 
        this.body = startBody;
        this.direction = direction;
        this.lastStepDirection = direction;
    },

    getBody() {
        return this.body;
    },

    getLastStepDirection() {
        return this.lastStepDirection;
    },

    isOnPoint(point) {//проверка находится ли точка на самой змейке 
        return this.getBody().some((snakePoint) => snakePoint.x === point.x && snakePoint.y === point.y);
    },

    makeStep() {//делаем шаг змейки
        this.lastStepDirection = this.direction;
        this.getBody().unshift(this.getNextStepHeadPoint()); //добавляем в начало массива первую следующую точку змейки
        this.getBody().pop();//удалили последний элемент массива змейки
    },

    growUp() {//метод который выращивает змейку
        const lastBodyIndex = this.body.length - 1; //находим координаты хвоста
        const lastBodyPoint = this.getBody()[lastBodyIndex]; //получаем саму точку хвоста
        const lastBodyPointClone = Object.assign({}, lastBodyPoint);//делаем дубликат данной точки 
        this.getBody().push(lastBodyPointClone);
    },

    getNextStepHeadPoint() {//получение данных о новом шаге
        const firstPoint = this.getBody()[0]; // получаем положение головы
        var step = 1;
        var widthMap = this.config.getColsCount() - 1;
        var heightMap = this.config.getRowsCount() - 1;
        var nolimints = this.config.getNoLimits();


        switch (this.direction) { //вычисляем какая будет новая координата в зависимости от направления c учетом убраны ли границы или нет
            case 'up':
                if (firstPoint.y === 0 && nolimints) step = heightMap * -1;
                return { x: firstPoint.x, y: firstPoint.y - step };
            case 'right':
                if (firstPoint.x === widthMap && nolimints) step = widthMap * -1;
                return { x: firstPoint.x + step, y: firstPoint.y };
            case 'down':
                if (firstPoint.y === heightMap && nolimints) step = heightMap * -1;
                return { x: firstPoint.x, y: firstPoint.y + step };
            case 'left':
                if (firstPoint.x === 0 && nolimints) step = widthMap * -1;
                return { x: firstPoint.x - step, y: firstPoint.y };
        }
    },

    setDirection(direction) {//устанавливает нужное направление
        this.direction = direction;
    },
};

const food = { //объект еда
    x: null,
    y: null,

    getCoordinates() { // получить координаты еды
        return {
            x: this.x,
            y: this.y,
        };
    },

    setCoordinates(point) { // устанавливает координаты
        this.x = point.x;
        this.y = point.y;
    },

    isOnPoint(point) {//проверяем совпадает ли эта точка с точкой еды, чтобы проверить еда находится на голове или нет
        return this.x === point.x && this.y === point.y;
    },
};

const status = { //статусы еды
    condition: null,

    setPlaying() {
        this.condition = 'playing';
    },

    setStopped() {
        this.condition = 'stopped';
    },

    setFinished() {
        this.condition = 'finished';
    },

    isPlaying() { // идет ли игра или нет
        return this.condition === 'playing';
    },

    isStopped() {
        return this.condition === 'stopped';
    },
};

const wall = { // объект стена препятствие
    xy: [],

    getCoordinatesWall() { // получить координаты стены
        return this.xy;
    },

    setCoordinatesWall(coordinatesArray) { // устанавливает координаты стены
        this.xy.length = 0;
        this.xy = coordinatesArray;
    },
    isOnPointWall(point) {//проверка находится ли точка на стене 
        return this.getCoordinatesWall().some((wallPoint) => wallPoint.x === point.x && wallPoint.y === point.y);
    },

};


const game = { // объект игра
    config,
    map,
    snake,
    food,
    status,
    tickInterval: null, // хранит интервал 
    wall,

    init(userSettings) { //устанавливаем настройки

        this.config.init(userSettings);
        const validationResult = this.config.validate(); //проверка настроек

        if (!validationResult.isValid) { //если не валидно, то выводим все ошибки
            for (const err of validationResult.errors) {
                console.log(err);
            }

            return; //если не корректные настройки, то завершаем игру
        }

        this.map.init(this.config.getRowsCount(), this.config.getColsCount()); //генерация ячеек

        this.setEventHandlers();
        this.wall.setCoordinatesWall(this.config.getWallCoordinates()); //Устанавливаем координаты стен из настроек
        this.reset(); //
    },

    reset() { //метод сброса игры
        this.stop();
        this.snake.init(this.getStartSnakeBody(), 'up'); // устовка начального массива змейки и начальное напрвление
        this.food.setCoordinates(this.getRandomFreeCoordinates()); //установка начальных координат еды через метод
        this.render();
    },

    render() { //рендер самой игры
        this.map.render(this.snake.getBody(), this.food.getCoordinates(), this.wall.getCoordinatesWall());
        this.displayScore(this.snake.getBody().length - 1); //вывываем метод отображения счета. Передаем длину змейки минус 1.
    },

    play() { //нажали на кнопку плэй
        this.status.setPlaying();
        this.tickInterval = setInterval(() => this.tickHandler(), 1000 / this.config.getSpeed()); //устанавливаем скорость в зависимости от тиков
        this.setPlayButton('Стоп');// меняем состояние кнопки
    },

    tickHandler() { //логика связанная с основными действиями 
        if (!this.canMakeStep()) { // можем ли мы делать шаг? или уперлись в стену
            return this.finish(); // если нет, то все остновка
        }

        if (this.food.isOnPoint(this.snake.getNextStepHeadPoint())) { // получаем слудующую точку
            this.snake.growUp();
            this.food.setCoordinates(this.getRandomFreeCoordinates());

            if (this.isGameWon()) {
                this.finish();
            }
        }

        this.snake.makeStep();
        this.render();

    },

    stop() { //остановка игры
        this.status.setStopped();
        clearInterval(this.tickInterval);
        this.setPlayButton('Старт');
    },

    finish() { // окончание игры 
        this.status.setFinished();
        clearInterval(this.tickInterval);
        this.setPlayButton('Игра закончена', true);
    },

    setPlayButton(textContents, isDisabled = false) { //Установка состояние кнопки старт стоп или играз закончена
        const playButton = document.getElementById('playButton');

        playButton.textContent = textContents;
        isDisabled ? playButton.classList.add('disabled') : playButton.classList.remove('disabled');
    },

    setEventHandlers() {//навешиваем собития на кнопки и на клвиатуру
        document.getElementById('playButton').addEventListener('click', () => {
            this.playClickHandler();
        });
        document.getElementById('newGameButton').addEventListener('click', () => {
            this.newGameClickHandler();
        });
        document.addEventListener('keydown', event => this.keyDownHandler(event));

        document.getElementById('nolimits').addEventListener('change', (event) =>
            this.config.setNoLimits(event.target.checked)
        );
    },

    getStartSnakeBody() {//генерирует бошку змейки в центре экрана
        return [
            {
                x: Math.floor(this.config.getColsCount() / 2),
                y: Math.floor(this.config.getRowsCount() / 2),
            }
        ];
    },

    getRandomFreeCoordinates() { //генерируем координаты еды
        const exclude = [this.food.getCoordinates(), ...this.snake.getBody(), ...this.wall.getCoordinatesWall()]; // нужно проверять не попала ли она на змейку или на еду. создаем и заполняем массив с координатой еды и всеми координатами змейки
        while (true) { //генерируем рандомное число в нужном диапазоне размера поля
            const rndPoint = {
                x: Math.floor(Math.random() * this.config.getColsCount()),
                y: Math.floor(Math.random() * this.config.getRowsCount()),
            };

            if (!exclude.some(exPoint => rndPoint.x === exPoint.x && rndPoint.y === exPoint.y)) { //проверяем попала ли она в занятый массив, генерируем пока не найдем новую точту
                return rndPoint;
            }
        }
    },

    playClickHandler() { //проверяет текущий статус игры и запускает или останавливает игру
        if (this.status.isPlaying()) {
            this.stop();
        } else if (this.status.isStopped()) {
            this.play();
        }
    },

    newGameClickHandler() { //делает новую игру
        this.reset();
    },

    keyDownHandler(event) { //обработка кликов
        if (!this.status.isPlaying()) return; // если игра в режиме остановки, то делать ничего не нужно

        const direction = this.getDirectionByCode(event.code); // получить направление по нажатой клавиши,

        if (this.canSetDirection(direction)) { //проверяем можем ли двигаться и можем ли установить направление
            this.snake.setDirection(direction);
        }
    },

    getDirectionByCode(code) {// определяем какую клавишу нажали, возращает направление
        switch (code) {
            case 'KeyW':
            case 'ArrowUp':
                return 'up';
            case 'KeyD':
            case 'ArrowRight':
                return 'right';
            case 'KeyS':
            case 'ArrowDown':
                return 'down';
            case 'KeyA':
            case 'ArrowLeft':
                return 'left';
            default:
                return '';
        }
    },

    canSetDirection(direction) { // валидируем может ли быть такое направление в зависимости от текущего
        const lastStepDirection = this.snake.getLastStepDirection();

        return direction === 'up' && lastStepDirection !== 'down' ||
            direction === 'right' && lastStepDirection !== 'left' ||
            direction === 'down' && lastStepDirection !== 'up' ||
            direction === 'left' && lastStepDirection !== 'right';
    },

    canMakeStep() { //можем ли мы вообще куда то ходить или уперлись!
        const nextHeadPoint = this.snake.getNextStepHeadPoint(); //получили след точку

        return !this.snake.isOnPoint(nextHeadPoint) && // не выходит ли точка за рамки и не скушает ли змейка сама себя
            nextHeadPoint.x < this.config.getColsCount() &&
            nextHeadPoint.y < this.config.getRowsCount() &&
            nextHeadPoint.x >= 0 &&
            nextHeadPoint.y >= 0 &&
            !this.wall.isOnPointWall(nextHeadPoint);
    },

    isGameWon() { // если мы выйграли переводим в состояние победа
        return this.snake.getBody().length > this.config.getWinFoodCount(); //проверяем длину змейки 
    },


    displayScore(score) {//отображает счет игры. Вызываем из метода render()
        const container = document.getElementById('score');
        container.textContent = score;
    },


};
game.init({ speed: 7 });
