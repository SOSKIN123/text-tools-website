// Константы и настройки
const MODES = [
    {id: 'removeDuplicates', name: 'Удалить дубликаты строк'},
    {id: 'shuffleLines', name: 'Перемешать строки'},
    {id: 'changeCase', name: 'Изменить регистр'},
    {id: 'addPrefix', name: 'Добавить префикс'},
    {id: 'addSuffix', name: 'Добавить суффикс'},
    {id: 'textStatistics', name: 'Статистика текста'},
    {id: 'findAndReplace', name: 'Найти и заменить'},
    {id: 'numberLines', name: 'Пронумеровать строки'},
    {id: 'extractLinks', name: 'Извлечь ссылки'},
    {id: 'sortLines', name: 'Сортировать'},
    {id: 'removeEmptyLines', name: 'Удалить пустые строки'},
    {id: 'removeCharacters', name: 'Удалить символы из списка'},
    {id: 'removeTextAroundSymbol', name: 'Удалить текст до/после символа'},
    {id: 'payVlito', name: 'PayVlito'}
];

const STORAGE_KEY = 'text-tools-mode-order';
const DARK_MODE_KEY = 'darkMode';

// DOM элементы
const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const input = document.getElementById('input');
const options = document.getElementById('options');
const processButton = document.getElementById('process-button');
const result = document.getElementById('result');
const modeButtons = document.getElementById('mode-buttons');
const copyButton = document.getElementById('copy-button');
const notification = document.getElementById('notification');
const themeToggle = document.getElementById('theme-toggle');
const burgerMenu = document.getElementById('burger-menu');
const closeButton = document.getElementById('close-button');
const currentModeTitle = document.getElementById('current-mode-title');

let currentMode = null;

// Функции для работы с текстом
const textFunctions = {
    removeDuplicates: (text) => [...new Set(text.split('\n'))].join('\n'),
    shuffleLines: (text) => text.split('\n').sort(() => Math.random() - 0.5).join('\n'),
    changeCase: (text, caseOption) => {
        switch (caseOption) {
            case 'upper': return text.toUpperCase();
            case 'lower': return text.toLowerCase();
            default: return text;
        }
    },
    addPrefix: (text, prefix) => text.split('\n').map(line => prefix + line).join('\n'),
    addSuffix: (text, suffix) => text.split('\n').map(line => line + suffix).join('\n'),
    textStatistics: (text) => {
        const lines = text.split('\n');
        const words = text.match(/\S+/g) || [];
        const chars = text.length;
        return `Строк: ${lines.length}\nСлов: ${words.length}\nСимволов: ${chars}`;
    },
    findAndReplace: (text, findText, replaceText) => text.replace(new RegExp(findText, 'g'), replaceText),
    numberLines: (text, numberFormat) => {
        return text.split('\n').map((line, index) => {
            switch (numberFormat) {
                case 'bracket': return `${index + 1}) ${line}`;
                case 'dot': return `${index + 1}. ${line}`;
                case 'space': return `${index + 1} ${line}`;
                default: return `${index + 1}. ${line}`;
            }
        }).join('\n');
    },
    extractLinks: (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9._-]+\.[a-zA-Z]{2,6}(?:\/[^\s]*)?)/g;
        return (text.match(urlRegex) || []).join('\n');
    },
    sortLines: (text, sortOption) => {
        const lines = text.split('\n');
        return sortOption === 'asc' ? lines.sort().join('\n') : lines.sort().reverse().join('\n');
    },
    removeEmptyLines: (text) => text.split('\n').filter(line => line.trim() !== '').join('\n'),
    removeCharacters: (text, chars) => {
        const regex = new RegExp(`[${chars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`, 'g');
        return text.replace(regex, '');
    },
    removeTextAroundSymbol: (text, symbol, direction) => {
        return text.split('\n').map(line => {
            const index = line.indexOf(symbol);
            if (index !== -1) {
                return direction === 'before' ? line.slice(index) : line.slice(0, index + 1);
            }
            return line;
        }).join('\n');
    },
    payVlito: (text) => {
        return text.split('\n').map(line => {
            const match = line.match(/(\d{16})/);
            if (match) {
                return `/PayVlito ${match[1]} card`;
            }
            return '';
        }).filter(line => line !== '').join('\n');
    }
};

// Функции для работы с интерфейсом
function createModeButtons() {
    console.log('Creating mode buttons');
    const modeButtons = document.getElementById('mode-buttons');
    if (!modeButtons) {
        console.error('Element with id "mode-buttons" not found');
        return;
    }
    modeButtons.innerHTML = '';
    
    let order = JSON.parse(localStorage.getItem(STORAGE_KEY)) || MODES.map(mode => mode.id);
    
    // Проверка и добавление отсутствующих режимов
    const missingModes = MODES.filter(mode => !order.includes(mode.id));
    if (missingModes.length > 0) {
        order = [...order, ...missingModes.map(mode => mode.id)];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    }
    
    order.forEach((modeId, index) => {
        const mode = MODES.find(m => m.id === modeId);
        if (mode) {
            const container = document.createElement('div');
            container.className = 'mode-button-container';
            container.draggable = true;
            container.dataset.modeId = mode.id;

            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';

            const button = document.createElement('button');
            button.className = 'mode-button';
            button.textContent = mode.name;
            button.dataset.modeId = mode.id;
            button.addEventListener('click', () => setMode(mode.id));

            container.append(dragHandle, button);
            modeButtons.appendChild(container);

            if (index === 0) {
                setMode(mode.id);
            }
        }
    });

    addDragListeners();
    addTouchDragListeners();

    if (window.innerWidth <= 768) {
        document.querySelectorAll('.drag-handle').forEach(handle => handle.style.display = 'none');
    }
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-button').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector(`.mode-button[data-mode-id="${mode}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        // Обновляем заголовок с названием текущего режима
        const currentModeTitle = document.getElementById('current-mode-title');
        currentModeTitle.textContent = activeButton.textContent;
    }
    updateOptions();

    // Закрываем меню на мобильных устройствах после выбора режима
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

function updateOptions() {
    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = '';

    switch (currentMode) {
        case 'changeCase':
            optionsDiv.innerHTML = `
                <select id="caseOption">
                    <option value="upper">Верхний регистр</option>
                    <option value="lower">Нижний регистр</option>
                </select>
            `;
            break;
        case 'addPrefix':
        case 'addSuffix':
            optionsDiv.innerHTML = `
                <input type="text" id="affix" placeholder="${currentMode === 'addPrefix' ? 'Префикс' : 'Суффикс'}">
            `;
            break;
        case 'findAndReplace':
            optionsDiv.innerHTML = `
                <input type="text" id="findText" placeholder="Найти">
                <input type="text" id="replaceText" placeholder="Заменить на">
            `;
            break;
        case 'numberLines':
            optionsDiv.innerHTML = `
                <select id="numberFormat">
                    <option value="bracket">1) </option>
                    <option value="dot">1. </option>
                    <option value="space">1 </option>
                </select>
            `;
            break;
        case 'sortLines':
            optionsDiv.innerHTML = `
                <select id="sortOption">
                    <option value="asc">По возрастанию</option>
                    <option value="desc">По убыванию</option>
                </select>
            `;
            break;
        case 'removeCharacters':
            optionsDiv.innerHTML = `
                <input type="text" id="charactersToRemove" placeholder="Символы для удаления" value="@#%^:&*()?!<>/'{}[]~«»">
            `;
            break;
        case 'removeTextAroundSymbol':
            optionsDiv.innerHTML = `
                <input type="text" id="symbolToRemoveAround" placeholder="Символ" maxlength="1">
                <select id="removeDirection">
                    <option value="before">Удалить до символа</option>
                    <option value="after">Удалить после символа</option>
                </select>
            `;
            break;
    }
}

function processText() {
    const input = document.getElementById('input');
    if (!input) return;
    const inputValue = input.value;
    const lines = inputValue.split('\n');

    let result = '';
    switch (currentMode) {
        case 'removeDuplicates':
            result = textFunctions.removeDuplicates(inputValue);
            break;
        case 'shuffleLines':
            result = textFunctions.shuffleLines(inputValue);
            break;
        case 'changeCase':
            const caseOption = document.getElementById('caseOption').value;
            result = textFunctions.changeCase(inputValue, caseOption);
            break;
        case 'addPrefix':
            const prefix = document.getElementById('affix').value;
            result = textFunctions.addPrefix(inputValue, prefix);
            break;
        case 'addSuffix':
            const suffix = document.getElementById('affix').value;
            result = textFunctions.addSuffix(inputValue, suffix);
            break;
        case 'textStatistics':
            result = textFunctions.textStatistics(inputValue);
            break;
        case 'findAndReplace':
            const findText = document.getElementById('findText').value;
            const replaceText = document.getElementById('replaceText').value;
            result = textFunctions.findAndReplace(inputValue, findText, replaceText);
            break;
        case 'numberLines':
            const numberFormat = document.getElementById('numberFormat').value;
            result = textFunctions.numberLines(inputValue, numberFormat);
            break;
        case 'extractLinks':
            result = textFunctions.extractLinks(inputValue);
            break;
        case 'sortLines':
            const sortOption = document.getElementById('sortOption').value;
            result = textFunctions.sortLines(inputValue, sortOption);
            break;
        case 'removeEmptyLines':
            result = textFunctions.removeEmptyLines(inputValue);
            break;
        case 'removeCharacters':
            const charactersToRemove = document.getElementById('charactersToRemove').value;
            result = textFunctions.removeCharacters(inputValue, charactersToRemove);
            break;
        case 'removeTextAroundSymbol':
            const symbol = document.getElementById('symbolToRemoveAround').value;
            const direction = document.getElementById('removeDirection').value;
            result = textFunctions.removeTextAroundSymbol(inputValue, symbol, direction);
            break;
        case 'payVlito':
            result = textFunctions.payVlito(inputValue);
            break;
        default:
            result = inputValue;
    }

    document.getElementById('result').value = result;
}

function copyResult() {
    const resultElement = document.getElementById('result');
    resultElement.select();
    document.execCommand('copy');
    showNotification();
}

function showNotification() {
    const notification = document.getElementById('notification');
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 2000);
}

function toggleSidebar() {
    console.log('toggleSidebar вызван');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    if (!sidebar || !content) {
        console.error('Не найден sidebar или content');
        return;
    }
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open');
    console.log('Состояние сайдбара:', sidebar.classList.contains('open') ? 'открыт' : 'закрыт');
    
    if (sidebar.classList.contains('open')) {
        document.addEventListener('click', closeSidebarOutside);
    } else {
        document.removeEventListener('click', closeSidebarOutside);
    }
}

function closeSidebarOutside(event) {
    console.log('closeSidebarOutside вызван');
    const sidebar = document.getElementById('sidebar');
    const burgerMenu = document.getElementById('burger-menu');
    
    if (!sidebar.contains(event.target) && event.target !== burgerMenu) {
        console.log('Закрытие сайдбара');
        toggleSidebar();
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
    const themeToggle = document.getElementById('theme-toggle');
    const isDarkMode = document.body.classList.contains('dark-mode');
    themeToggle.innerHTML = isDarkMode
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>';
}

function applyTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    updateThemeToggleIcon();
}

function addDragListeners() {
    const containers = document.querySelectorAll('.mode-button-container');
    const modeButtons = document.getElementById('mode-buttons');

    containers.forEach(container => {
        container.addEventListener('dragstart', (e) => {
            draggedItem = container;
            setTimeout(() => container.classList.add('dragging'), 0);
        });

        container.addEventListener('dragend', () => {
            container.classList.remove('dragging');
            saveButtonOrder();
        });
    });

    modeButtons.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(modeButtons, e.clientY);
        if (draggedItem && afterElement) {
            modeButtons.insertBefore(draggedItem, afterElement);
        }
    });

    modeButtons.addEventListener('dragenter', (e) => e.preventDefault());
    modeButtons.addEventListener('drop', (e) => e.preventDefault());
}

function addTouchDragListeners() {
    const containers = document.querySelectorAll('.mode-button-container');
    const modeButtons = document.getElementById('mode-buttons');

    let draggedItem = null;
    let startY;

    const handleTouchStart = function(e) {
        draggedItem = this;
        startY = e.touches[0].clientY - draggedItem.offsetTop;
        setTimeout(() => draggedItem.classList.add('dragging'), 0);
    };

    const handleTouchMove = function(e) {
        if (!draggedItem) return;
        e.preventDefault();
        const currentY = e.touches[0].clientY - modeButtons.offsetTop;
        draggedItem.style.top = `${currentY - startY}px`;

        const afterElement = getDragAfterElement(modeButtons, currentY);
        if (afterElement) {
            modeButtons.insertBefore(draggedItem, afterElement);
        } else {
            modeButtons.appendChild(draggedItem);
        }
    };

    const handleTouchEnd = function() {
        if (!draggedItem) return;
        draggedItem.classList.remove('dragging');
        draggedItem.style.top = '';
        draggedItem = null;
        saveButtonOrder();
    };

    containers.forEach(container => {
        container.addEventListener('touchstart', handleTouchStart, false);
        container.addEventListener('touchmove', handleTouchMove, false);
        container.addEventListener('touchend', handleTouchEnd, false);
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.mode-button-container:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveButtonOrder() {
    const order = Array.from(document.querySelectorAll('.mode-button-container'))
        .map(container => container.dataset.modeId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

function handleResize() {
    console.log('Изменение размера окна');
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.drag-handle').forEach(handle => {
            handle.style.display = 'none';
        });
    } else {
        document.querySelectorAll('.drag-handle').forEach(handle => {
            handle.style.display = 'block';
        });
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM полностью загружен');
    createModeButtons();
    applyTheme();
    
    processButton.addEventListener('click', processText);
    copyButton.addEventListener('click', copyResult);
    themeToggle.addEventListener('click', toggleTheme);
    burgerMenu.addEventListener('click', (event) => {
        console.log('Клик по бургер-меню');
        event.stopPropagation();
        toggleSidebar();
    });
    closeButton.addEventListener('click', toggleSidebar);

    window.addEventListener('resize', handleResize);
    console.log('Обработчик изменения размера окна добавлен');
});