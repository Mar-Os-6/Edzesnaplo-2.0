// ELEMEK KIJELÖLÉSE
const form = document.getElementById('workout-form');
const dateInput = document.getElementById('workout-date');
const muscleGroupSelect = document.getElementById('muscle-group');
const quickExercisesContainer = document.getElementById('quick-exercises');
const exerciseInput = document.getElementById('exercise');

const quickFillBtn = document.getElementById('quick-fill-btn');
const historyHint = document.getElementById('history-hint');

const resistanceFields = document.getElementById('resistance-fields');
const setsContainer = document.getElementById('sets-container');
const addSetBtn = document.getElementById('add-set-btn');
const cardioFields = document.getElementById('cardio-fields');

const cardioTimeInput = document.getElementById('cardio-time');
const cardioInclineInput = document.getElementById('cardio-incline');
const cardioSpeedInput = document.getElementById('cardio-speed');

const noteInput = document.getElementById('note');
const workoutList = document.getElementById('workout-list');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');
const searchFilterInput = document.getElementById('search-filter');

// SABLON ELEMEK
const templateSelect = document.getElementById('template-select');
const startTemplateBtn = document.getElementById('start-template-btn');
const editTemplateBtn = document.getElementById('edit-template-btn');
const toggleNewTemplateBtn = document.getElementById('toggle-new-template-btn');
const deleteTemplateBtn = document.getElementById('delete-template-btn');

const createTemplateBox = document.getElementById('create-template-box');
const templateFormTitle = document.getElementById('template-form-title');
const newTemplateNameInput = document.getElementById('new-template-name');

const templateMuscleChips = document.getElementById('template-muscle-chips');
const templateAvailableExercises = document.getElementById('template-available-exercises');
const customTemplateExInput = document.getElementById('custom-template-ex-input');
const addCustomTemplateExBtn = document.getElementById('add-custom-template-ex-btn');
const templateSelectedExercises = document.getElementById('template-selected-exercises');

const saveNewTemplateBtn = document.getElementById('save-new-template-btn');
const cancelNewTemplateBtn = document.getElementById('cancel-new-template-btn');

const activeTemplateBanner = document.getElementById('active-template-banner');
const activeTemplateInfo = document.getElementById('active-template-info');
const cancelTemplateBtn = document.getElementById('cancel-template-btn');

// PR, GRAFIKON, TESTADATOK, NAPTÁR & MODÁL ELEMEK
const prSummaryContainer = document.getElementById('pr-summary-container');
const chartExerciseSelect = document.getElementById('chart-exercise-select');
const chartContainer = document.getElementById('chart-container');
const bodyForm = document.getElementById('body-form');
const bodyDateInput = document.getElementById('body-date');
const bodyWeightInput = document.getElementById('body-weight');
const bodyFatInput = document.getElementById('body-fat');
const bodyChestInput = document.getElementById('body-chest');
const bodyArmInput = document.getElementById('body-arm');
const bodyWaistInput = document.getElementById('body-waist');
const bodyThighInput = document.getElementById('body-thigh');
const bodyList = document.getElementById('body-list');

const calendarDaysContainer = document.getElementById('calendar-days');
const calendarMonthTitle = document.getElementById('calendar-month-title');
const dayModal = document.getElementById('day-modal');
const modalDateTitle = document.getElementById('modal-date-title');
const modalBodyContent = document.getElementById('modal-body-content');

dateInput.value = new Date().toISOString().split('T')[0];
if (bodyDateInput) bodyDateInput.value = new Date().toISOString().split('T')[0];

let currentCalendarDate = new Date();
let currentMuscleFilter = 'Összes';
let lastFoundWorkout = null;

const defaultExercises = {
    'Mell': ['Fekvenyomás', 'Incline Fekvenyomás', 'Tárogatás'],
    'Bicepsz': ['Bicepsz állva franciarúddal', 'Kalapács hajlítás'],
    'Hát': ['Mellhez húzás csigán', 'Evezés döntött törzzsel', 'Húzódzkodás'],
    'Tricepsz': ['Tricepsz letolás csigán', 'Lónyomás'],
    'Váll': ['Vállból nyomás kézisúlyzóval', 'Oldalemelés'],
    'Láb': ['Guggolás', 'Lábnyomás', 'Lábhajlítás gépen'],
    'Popsi': ['Csípőemelés (Hip Thrust)', 'Bolgár guggolás', 'Glute Bridge (Híd)', 'Kickback csigán', 'Román felhúzás'],
    'Has': ['Hasprés', 'Lábelemelés függeszkedve'],
    'Kardió': ['Futópad (Incline walking)', 'Lépcsőzőgép', 'Szobakerékpár']
};

const defaultTemplates = [
    {
        name: "A nap: Mell - Tricepsz",
        muscleGroups: ["Mell", "Tricepsz"],
        exercises: [
            { name: "Fekvenyomás", muscleGroup: "Mell" },
            { name: "Incline Fekvenyomás", muscleGroup: "Mell" },
            { name: "Tárogatás", muscleGroup: "Mell" },
            { name: "Tricepsz letolás csigán", muscleGroup: "Tricepsz" }
        ]
    },
    {
        name: "B nap: Hát - Bicepsz",
        muscleGroups: ["Hát", "Bicepsz"],
        exercises: [
            { name: "Húzódzkodás", muscleGroup: "Hát" },
            { name: "Mellhez húzás csigán", muscleGroup: "Hát" },
            { name: "Evezés döntött törzzsel", muscleGroup: "Hát" },
            { name: "Bicepsz állva franciarúddal", muscleGroup: "Bicepsz" }
        ]
    },
    {
        name: "C nap: Láb - Váll",
        muscleGroups: ["Láb", "Váll"],
        exercises: [
            { name: "Guggolás", muscleGroup: "Láb" },
            { name: "Lábnyomás", muscleGroup: "Láb" },
            { name: "Vállból nyomás kézisúlyzóval", muscleGroup: "Váll" },
            { name: "Oldalemelés", muscleGroup: "Váll" }
        ]
    }
];

let editingTemplateIndex = null;
let builderSelectedMuscles = [];
let builderSelectedExercises = [];
let activeSession = null;

document.addEventListener('DOMContentLoaded', () => {
    loadWorkouts();
    renderQuickExercises();
    handleMuscleGroupChange();
    resetSetRows();
    loadTemplates();
    loadBodyRecords();
    updatePRSummary();
    populateChartExerciseSelect();
    renderCalendar();
    updateFloatingTimerDisplay();
});

// --- LENTI NÉZET VÁLTÓ LOGIKA ---
function switchTab(viewName) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));

    if (viewName === 'workout') {
        document.getElementById('view-workout').classList.remove('hidden');
        document.querySelectorAll('.bottom-nav .nav-item')[0].classList.add('active');
    } else if (viewName === 'history') {
        document.getElementById('view-history').classList.remove('hidden');
        document.querySelectorAll('.bottom-nav .nav-item')[1].classList.add('active');
        updatePRSummary();
        populateChartExerciseSelect();
        renderCalendar();
    } else if (viewName === 'body') {
        document.getElementById('view-body').classList.remove('hidden');
        document.querySelectorAll('.bottom-nav .nav-item')[2].classList.add('active');
        loadBodyRecords();
    }
}

// --- EDZÉSNAPTÁR & MODÁL LOGIKA ---
function renderCalendar() {
    calendarDaysContainer.innerHTML = '';
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
    calendarMonthTitle.textContent = `${monthNames[month]} ${year}`;

    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();
    const workouts = getWorkoutsFromStorage();
    
    const workoutsByDate = {};
    workouts.forEach(w => {
        if (!workoutsByDate[w.date]) workoutsByDate[w.date] = [];
        workoutsByDate[w.date].push(w);
    });

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarDaysContainer.appendChild(emptyCell);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let day = 1; day <= totalDays; day++) {
        const cellDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.textContent = day;

        if (cellDate === todayStr) {
            cell.classList.add('today');
        }

        if (workoutsByDate[cellDate]) {
            cell.classList.add('has-workout');
            cell.onclick = () => openDayModal(cellDate, workoutsByDate[cellDate]);
        }

        calendarDaysContainer.appendChild(cell);
    }
}

function changeMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
}

function openDayModal(dateStr, dayWorkouts) {
    modalDateTitle.textContent = `📅 ${dateStr} összefoglaló`;
    modalBodyContent.innerHTML = '';

    dayWorkouts.forEach(w => {
        const div = document.createElement('div');
        div.className = 'modal-workout-item';
        
        let details = '';
        if (w.isCardio) {
            details = `⏱️ ${w.time || '0'} perc (${w.incline || '-'}, ${w.speed ? w.speed + ' km/h' : '-'})`;
        } else {
            details = `💪 ${w.weight} kg x ${w.reps} ismétlés`;
        }

        div.innerHTML = `
            <div style="font-weight: bold; color: var(--accent-green); margin-bottom: 2px;">${w.exercise} <small style="color:#aaa;">(${w.muscleGroup || '-'})</small></div>
            <div>${details}</div>
            ${w.note ? `<div style="color: #bbb; font-style: italic; font-size: 0.78rem; margin-top: 4px;">Jegyzet: ${w.note}</div>` : ''}
        `;
        modalBodyContent.appendChild(div);
    });

    dayModal.classList.remove('hidden');
}

function closeDayModal() { dayModal.classList.add('hidden'); }
window.addEventListener('click', (e) => { if (e.target === dayModal) closeDayModal(); });

// --- IZOMCSOPORT SZŰRŐ AZ ELŐZMÉNYEKHEZ ---
function filterHistoryByMuscle(muscleGroup, chipElement) {
    currentMuscleFilter = muscleGroup;
    document.querySelectorAll('#history-filter-chips .chip').forEach(c => c.classList.remove('active'));
    chipElement.classList.add('active');
    loadWorkouts();
}

// --- TESTADATOK LOGIKA ---
function getBodyRecordsFromStorage() {
    const stored = localStorage.getItem('bodyRecords');
    return stored ? JSON.parse(stored) : [];
}

function saveBodyRecordsToStorage(records) {
    localStorage.setItem('bodyRecords', JSON.stringify(records));
}

bodyForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const record = {
        id: Date.now(),
        date: bodyDateInput.value,
        weight: bodyWeightInput.value || '-',
        fat: bodyFatInput.value || '-',
        chest: bodyChestInput.value || '-',
        arm: bodyArmInput.value || '-',
        waist: bodyWaistInput.value || '-',
        thigh: bodyThighInput.value || '-'
    };

    let records = getBodyRecordsFromStorage();
    records.push(record);
    saveBodyRecordsToStorage(records);
    loadBodyRecords();

    bodyWeightInput.value = '';
    bodyFatInput.value = '';
    bodyChestInput.value = '';
    bodyArmInput.value = '';
    bodyWaistInput.value = '';
    bodyThighInput.value = '';
    alert('✅ Testadatok sikeresen mentve!');
});

function loadBodyRecords() {
    if (!bodyList) return;
    bodyList.innerHTML = '';
    const records = getBodyRecordsFromStorage();
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (records.length === 0) {
        bodyList.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">Nincsenek rögzített testadatok.</td></tr>';
        return;
    }

    records.forEach(rec => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${rec.date}</td>
            <td><strong>${rec.weight} kg</strong></td>
            <td>${rec.fat}%</td>
            <td>${rec.chest} cm</td>
            <td>${rec.arm} cm</td>
            <td>${rec.waist} cm</td>
            <td>${rec.thigh} cm</td>
            <td><button class="delete-btn" onclick="deleteBodyRecord(${rec.id})">X</button></td>
        `;
        bodyList.appendChild(tr);
    });
}

function deleteBodyRecord(id) {
    let records = getBodyRecordsFromStorage();
    records = records.filter(r => r.id !== id);
    saveBodyRecordsToStorage(records);
    loadBodyRecords();
}

// --- PR ÖSSZESÍTŐ & GRAFIKON LOGIKA ---
function updatePRSummary() {
    const workouts = getWorkoutsFromStorage();
    const maxWeights = {};

    workouts.forEach(w => {
        if (!w.isCardio) {
            const exName = w.exercise;
            const wNum = parseFloat(w.weight) || 0;
            if (!maxWeights[exName] || wNum > maxWeights[exName]) {
                maxWeights[exName] = wNum;
            }
        }
    });

    prSummaryContainer.innerHTML = '';
    const exercises = Object.keys(maxWeights);

    if (exercises.length === 0) {
        prSummaryContainer.innerHTML = '<small style="color:#888;">Még nincsenek rögzített súlyok.</small>';
        return;
    }

    exercises.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'pr-item';
        div.innerHTML = `<span><strong>${ex}</strong></span> <span style="color:var(--accent-green); font-weight:bold;">🏆 ${maxWeights[ex]} kg</span>`;
        prSummaryContainer.appendChild(div);
    });
}

function populateChartExerciseSelect() {
    const workouts = getWorkoutsFromStorage();
    const exercises = [...new Set(workouts.filter(w => !w.isCardio).map(w => w.exercise))];
    const currentVal = chartExerciseSelect.value;

    chartExerciseSelect.innerHTML = '<option value="">-- Válassz gyakorlatot --</option>';
    exercises.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex;
        opt.textContent = ex;
        chartExerciseSelect.appendChild(opt);
    });

    if (exercises.includes(currentVal)) {
        chartExerciseSelect.value = currentVal;
    }
    renderChart();
}

function renderChart() {
    const selectedEx = chartExerciseSelect.value;
    chartContainer.innerHTML = '';

    if (!selectedEx) {
        chartContainer.innerHTML = '<small style="color:#888;">Válassz gyakorlatot a fejlődés megtekintéséhez.</small>';
        return;
    }

    const workouts = getWorkoutsFromStorage();
    const historyMap = {};
    workouts.filter(w => !w.isCardio && w.exercise === selectedEx).forEach(w => {
        const wNum = parseFloat(w.weight) || 0;
        if (!historyMap[w.date] || wNum > historyMap[w.date]) {
            historyMap[w.date] = wNum;
        }
    });

    const dates = Object.keys(historyMap).sort((a, b) => new Date(a) - new Date(b));
    if (dates.length === 0) {
        chartContainer.innerHTML = '<small style="color:#888;">Nincs adat ehhez a gyakorlathoz.</small>';
        return;
    }

    const maxW = Math.max(...Object.values(historyMap));

    dates.forEach(date => {
        const weight = historyMap[date];
        const percent = maxW > 0 ? Math.round((weight / maxW) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'chart-bar-row';
        row.innerHTML = `
            <span style="width: 80px; color:var(--text-muted); font-size:0.7rem;">${date}</span>
            <div class="chart-bar-bg">
                <div class="chart-bar-fill" style="width: ${Math.max(percent, 15)}%;">${weight} kg</div>
            </div>
        `;
        chartContainer.appendChild(row);
    });
}

// --- EDZÉSTERV SABLON LOGIKA ---
function getCustomTemplates() {
    const stored = localStorage.getItem('customTemplates');
    return stored ? JSON.parse(stored) : defaultTemplates;
}

function saveCustomTemplates(templates) {
    localStorage.setItem('customTemplates', JSON.stringify(templates));
}

function loadTemplates() {
    const templates = getCustomTemplates();
    templateSelect.innerHTML = '<option value="">-- Válassz edzéstervet --</option>';
    templates.forEach((t, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = t.name;
        templateSelect.appendChild(opt);
    });
}

toggleNewTemplateBtn.addEventListener('click', () => openTemplateBuilder(null));
editTemplateBtn.addEventListener('click', () => {
    const val = templateSelect.value;
    if (val === '') { alert('Kérlek válaszd ki a szerkeszteni kívánt sablont!'); return; }
    openTemplateBuilder(parseInt(val));
});
cancelNewTemplateBtn.addEventListener('click', () => createTemplateBox.classList.add('hidden'));

function findMuscleGroupForExercise(exName) {
    const allEx = getCustomExercises();
    for (const group in allEx) {
        if (allEx[group].some(item => item.toLowerCase() === exName.toLowerCase())) {
            return group;
        }
    }
    return muscleGroupSelect.value || 'Mell';
}

function openTemplateBuilder(templateIndex = null) {
    editingTemplateIndex = templateIndex;
    const templates = getCustomTemplates();
    if (templateIndex !== null && templates[templateIndex]) {
        const t = templates[templateIndex];
        templateFormTitle.textContent = '✏️ Sablon Szerkesztése';
        newTemplateNameInput.value = t.name;
        builderSelectedMuscles = t.muscleGroups ? [...t.muscleGroups] : [];
        builderSelectedExercises = t.exercises ? t.exercises.map(ex => typeof ex === 'string' ? { name: ex, muscleGroup: findMuscleGroupForExercise(ex) } : {...ex}) : [];
    } else {
        templateFormTitle.textContent = '✨ Új Sablon Létrehozása';
        newTemplateNameInput.value = '';
        builderSelectedMuscles = [];
        builderSelectedExercises = [];
    }
    renderTemplateMuscleChips();
    renderTemplateAvailableExercises();
    renderTemplateSelectedExercises();
    createTemplateBox.classList.remove('hidden');
}

function renderTemplateMuscleChips() {
    templateMuscleChips.innerHTML = '';
    ['Mell', 'Bicepsz', 'Hát', 'Tricepsz', 'Váll', 'Láb', 'Popsi', 'Has', 'Kardió'].forEach(group => {
        const isSelected = builderSelectedMuscles.includes(group);
        const chip = document.createElement('div');
        chip.className = `chip ${isSelected ? 'active' : ''}`;
        chip.textContent = group;
        chip.onclick = () => {
            if (isSelected) builderSelectedMuscles = builderSelectedMuscles.filter(m => m !== group);
            else builderSelectedMuscles.push(group);
            renderTemplateMuscleChips();
            renderTemplateAvailableExercises();
        };
        templateMuscleChips.appendChild(chip);
    });
}

function renderTemplateAvailableExercises() {
    templateAvailableExercises.innerHTML = '';
    const allExercises = getCustomExercises();
    let available = [];
    if (builderSelectedMuscles.length === 0) {
        for (const group in allExercises) available = available.concat(allExercises[group]);
    } else {
        builderSelectedMuscles.forEach(group => {
            if (allExercises[group]) available = available.concat(allExercises[group]);
        });
    }
    available = [...new Set(available)];
    available.forEach(exName => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = `+ ${exName}`;
        chip.onclick = () => { 
            const mg = findMuscleGroupForExercise(exName);
            builderSelectedExercises.push({ name: exName, muscleGroup: mg }); 
            renderTemplateSelectedExercises(); 
        };
        templateAvailableExercises.appendChild(chip);
    });
}

addCustomTemplateExBtn.addEventListener('click', () => {
    const val = customTemplateExInput.value.trim();
    if (val) { 
        const mg = muscleGroupSelect.value || (builderSelectedMuscles.length > 0 ? builderSelectedMuscles[0] : 'Mell');
        builderSelectedExercises.push({ name: val, muscleGroup: mg }); 
        customTemplateExInput.value = ''; 
        renderTemplateSelectedExercises(); 
    }
});

function renderTemplateSelectedExercises() {
    templateSelectedExercises.innerHTML = '';
    if (builderSelectedExercises.length === 0) {
        templateSelectedExercises.innerHTML = '<small style="color:#888;">Még nem választottál ki gyakorlatot.</small>';
        return;
    }
    builderSelectedExercises.forEach((ex, index) => {
        const exName = typeof ex === 'string' ? ex : ex.name;
        const exGroup = typeof ex === 'string' ? findMuscleGroupForExercise(ex) : ex.muscleGroup;
        const chip = document.createElement('div');
        chip.className = 'chip selected-chip';
        chip.innerHTML = `<span>${index + 1}. ${exName} <small style="opacity:0.8">(${exGroup})</small></span><span class="delete-chip" onclick="removeExerciseFromBuilder(${index})">×</span>`;
        templateSelectedExercises.appendChild(chip);
    });
}

function removeExerciseFromBuilder(index) {
    builderSelectedExercises.splice(index, 1);
    renderTemplateSelectedExercises();
}

saveNewTemplateBtn.addEventListener('click', () => {
    const name = newTemplateNameInput.value.trim();
    if (!name) { alert('Kérlek add meg a sablon nevét!'); return; }
    if (builderSelectedExercises.length === 0) { alert('Kérlek válassz ki legalább 1 gyakorlatot!'); return; }
    const templates = getCustomTemplates();
    const templateData = { 
        name, 
        muscleGroups: builderSelectedMuscles, 
        exercises: builderSelectedExercises.map(ex => typeof ex === 'string' ? { name: ex, muscleGroup: findMuscleGroupForExercise(ex) } : ex) 
    };
    if (editingTemplateIndex !== null) templates[editingTemplateIndex] = templateData;
    else templates.push(templateData);
    saveCustomTemplates(templates);
    createTemplateBox.classList.add('hidden');
    loadTemplates();
    alert('✅ Sablon sikeresen elmentve!');
});

deleteTemplateBtn.addEventListener('click', () => {
    const val = templateSelect.value;
    if (val === '') { alert('Kérlek válaszd ki a törölni kívánt sablont!'); return; }
    let templates = getCustomTemplates();
    if (confirm(`Biztosan törölni akarod a(z) "${templates[val].name}" sablont?`)) {
        templates.splice(val, 1);
        saveCustomTemplates(templates);
        loadTemplates();
    }
});

startTemplateBtn.addEventListener('click', () => {
    const val = templateSelect.value;
    if (val === '') { alert('Kérlek válaszd ki az indítani kívánt sablont!'); return; }
    const templates = getCustomTemplates();
    const t = templates[val];
    const normalizedExercises = t.exercises.map(ex => typeof ex === 'string' ? { name: ex, muscleGroup: findMuscleGroupForExercise(ex) } : ex);
    activeSession = { templateName: t.name, exercises: normalizedExercises, currentIndex: 0 };
    updateActiveSessionUI();
});

cancelTemplateBtn.addEventListener('click', () => {
    activeSession = null;
    activeTemplateBanner.classList.add('hidden');
    exerciseInput.value = '';
    historyHint.textContent = '';
    quickFillBtn.classList.add('hidden');
});

function updateActiveSessionUI() {
    if (!activeSession) { activeTemplateBanner.classList.add('hidden'); return; }
    const total = activeSession.exercises.length;
    const currentNum = activeSession.currentIndex + 1;
    if (activeSession.currentIndex >= total) {
        alert(`🎉 Gratulálunk! Teljesítetted a "${activeSession.templateName}" edzéstervet!`);
        activeSession = null;
        activeTemplateBanner.classList.add('hidden');
        exerciseInput.value = '';
        historyHint.textContent = '';
        quickFillBtn.classList.add('hidden');
        return;
    }
    const currentExObj = activeSession.exercises[activeSession.currentIndex];
    const currentExName = typeof currentExObj === 'string' ? currentExObj : currentExObj.name;
    const currentExGroup = typeof currentExObj === 'string' ? findMuscleGroupForExercise(currentExName) : currentExObj.muscleGroup;

    activeTemplateInfo.textContent = `📋 ${activeSession.templateName} (${currentNum}/${total}: ${currentExName})`;
    activeTemplateBanner.classList.remove('hidden');
    
    exerciseInput.value = currentExName;
    muscleGroupSelect.value = currentExGroup;
    renderQuickExercises();
    handleMuscleGroupChange();
    checkPreviousWeight();
}

// --- DINAMIKUS SOROZAT KEZELÉS ---
addSetBtn.addEventListener('click', () => addSetRow());

function addSetRow(weight = '', reps = '') {
    const rowCount = setsContainer.children.length + 1;
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
        <span class="set-number">${rowCount}.</span>
        <input type="number" class="set-weight form-control" placeholder="Súly (kg)" step="0.5" value="${weight}">
        <input type="number" class="set-reps form-control" placeholder="Ismétlés" value="${reps}">
        <button type="button" class="remove-set-btn" onclick="removeSetRow(this)">✕</button>
    `;
    setsContainer.appendChild(row);
    updateRemoveButtonsVisibility();
}

function removeSetRow(btn) {
    if (setsContainer.children.length > 1) {
        btn.closest('.set-row').remove();
        renumberSetRows();
    }
}

function renumberSetRows() {
    const rows = setsContainer.querySelectorAll('.set-row');
    rows.forEach((row, idx) => { row.querySelector('.set-number').textContent = `${idx + 1}.`; });
    updateRemoveButtonsVisibility();
}

function updateRemoveButtonsVisibility() {
    const rows = setsContainer.querySelectorAll('.set-row');
    rows.forEach(row => {
        const btn = row.querySelector('.remove-set-btn');
        btn.style.visibility = rows.length === 1 ? 'hidden' : 'visible';
    });
}

function resetSetRows() {
    setsContainer.innerHTML = '';
    addSetRow();
}

muscleGroupSelect.addEventListener('change', () => {
    if (!activeSession) { exerciseInput.value = ''; historyHint.textContent = ''; quickFillBtn.classList.add('hidden'); }
    resetSetRows();
    renderQuickExercises();
    handleMuscleGroupChange();
});

function handleMuscleGroupChange() {
    const isCardio = muscleGroupSelect.value === 'Kardió';
    if (isCardio) {
        resistanceFields.classList.add('hidden');
        cardioFields.classList.remove('hidden');
        exerciseInput.placeholder = "pl. Futópad dőlésszöggel";
    } else {
        cardioFields.classList.add('hidden');
        resistanceFields.classList.remove('hidden');
        exerciseInput.placeholder = "pl. Fekvenyomás";
    }
}

function getCustomExercises() {
    const stored = localStorage.getItem('customExercises');
    return stored ? JSON.parse(stored) : defaultExercises;
}

function saveCustomExercises(exercises) {
    localStorage.setItem('customExercises', JSON.stringify(exercises));
}

function renderQuickExercises() {
    quickExercisesContainer.innerHTML = '';
    const selectedGroup = muscleGroupSelect.value;
    const allExercises = getCustomExercises();
    (allExercises[selectedGroup] || []).forEach(exName => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `<span onclick="selectExercise('${exName}')">${exName}</span><span class="delete-chip" onclick="deleteCustomExercise(event, '${selectedGroup}', '${exName}')">×</span>`;
        quickExercisesContainer.appendChild(chip);
    });
}

function selectExercise(name) {
    exerciseInput.value = name;
    checkPreviousWeight();
}

function deleteCustomExercise(event, group, name) {
    event.stopPropagation();
    let allExercises = getCustomExercises();
    if (allExercises[group]) {
        allExercises[group] = allExercises[group].filter(item => item !== name);
        saveCustomExercises(allExercises);
        renderQuickExercises();
    }
}

function addCustomExerciseToGroup(group, name) {
    let allExercises = getCustomExercises();
    if (!allExercises[group]) allExercises[group] = [];
    if (!allExercises[group].some(item => item.toLowerCase() === name.toLowerCase())) {
        allExercises[group].push(name);
        saveCustomExercises(allExercises);
        renderQuickExercises();
    }
}

exerciseInput.addEventListener('input', checkPreviousWeight);

// ⚡ GYORSSZINT ÉS PREVIOUS WEIGHT KEZELÉS
function checkPreviousWeight() {
    const query = exerciseInput.value.trim().toLowerCase();
    if (!query) { 
        historyHint.textContent = ''; 
        quickFillBtn.classList.add('hidden');
        lastFoundWorkout = null;
        return; 
    }
    const workouts = getWorkoutsFromStorage();
    lastFoundWorkout = workouts.slice().reverse().find(w => w.exercise.toLowerCase() === query);
    
    if (lastFoundWorkout) {
        if (lastFoundWorkout.isCardio) {
            historyHint.textContent = `Legutóbb: ${lastFoundWorkout.time} perc (${lastFoundWorkout.incline || '-'}, ${lastFoundWorkout.speed ? lastFoundWorkout.speed + ' km/h' : '-'})`;
            quickFillBtn.classList.add('hidden');
        } else {
            historyHint.textContent = `Legutóbb: ${lastFoundWorkout.weight} kg x ${lastFoundWorkout.reps} (${lastFoundWorkout.date})`;
            quickFillBtn.querySelector('span').textContent = `⚡ Legutóbbi betöltése (${lastFoundWorkout.weight} kg × ${lastFoundWorkout.reps})`;
            quickFillBtn.classList.remove('hidden');
        }
    } else {
        historyHint.textContent = '';
        quickFillBtn.classList.add('hidden');
        lastFoundWorkout = null;
    }
}

quickFillBtn.addEventListener('click', () => {
    if (lastFoundWorkout && !lastFoundWorkout.isCardio) {
        resetSetRows();
        const firstRow = setsContainer.querySelector('.set-row');
        if (firstRow) {
            firstRow.querySelector('.set-weight').value = lastFoundWorkout.weight;
            firstRow.querySelector('.set-reps').value = lastFoundWorkout.reps;
        }
    }
});

// MENTÉS
form.addEventListener('submit', function(e) {
    e.preventDefault();
    const currentDate = dateInput.value;
    const currentMuscleGroup = muscleGroupSelect.value;
    const currentExercise = exerciseInput.value.trim();
    const isCardio = currentMuscleGroup === 'Kardió';

    if (isCardio) {
        let workout = {
            id: Date.now(),
            date: currentDate,
            muscleGroup: currentMuscleGroup,
            exercise: currentExercise,
            isCardio: true,
            time: cardioTimeInput.value,
            incline: cardioInclineInput.value.trim(),
            speed: cardioSpeedInput.value,
            note: noteInput.value.trim()
        };
        saveWorkoutToStorage(workout);
    } else {
        const rows = setsContainer.querySelectorAll('.set-row');
        rows.forEach((row, index) => {
            const weightVal = row.querySelector('.set-weight').value;
            const repsVal = row.querySelector('.set-reps').value;
            if (weightVal !== '' || repsVal !== '') {
                let workout = {
                    id: Date.now() + index,
                    date: currentDate,
                    muscleGroup: currentMuscleGroup,
                    exercise: currentExercise,
                    isCardio: false,
                    weight: weightVal || '0',
                    reps: repsVal || '0',
                    note: noteInput.value.trim()
                };
                saveWorkoutToStorage(workout);
            }
        });
    }

    addCustomExerciseToGroup(currentMuscleGroup, currentExercise);
    exerciseInput.value = '';
    cardioTimeInput.value = '';
    cardioInclineInput.value = '';
    cardioSpeedInput.value = '';
    noteInput.value = '';
    historyHint.textContent = '';
    quickFillBtn.classList.add('hidden');
    resetSetRows();
    loadWorkouts();
    updatePRSummary();
    populateChartExerciseSelect();
    renderCalendar();

    // PIHENŐIDŐZÍTŐ INDÍTÁSA SIKERES MENTÉSKOR (alapértelmezett 60s)
    if (cdTotalSeconds <= 0) cdTotalSeconds = 60;
    toggleCountdown();

    if (activeSession) {
        activeSession.currentIndex++;
        updateActiveSessionUI();
    }
});

function addWorkoutToTable(workout, totalSetsCount, currentSetNum, isPR) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', workout.id);
    let col4 = '', col5 = '';

    if (workout.isCardio) {
        col4 = `⏱️ ${workout.time || '0'} perc`;
        let details = [];
        if (workout.incline) details.push(`Dőlés: ${workout.incline}`);
        if (workout.speed) details.push(`${workout.speed} km/h`);
        col5 = details.join(' | ') || '-';
    } else {
        const prTag = isPR ? `<span class="pr-badge">🏆 PR</span>` : '';
        col4 = `${workout.weight} kg ${prTag}`;
        col5 = totalSetsCount > 1 ? `${workout.reps}x <small>(${currentSetNum}. sorozat)</small>` : `${workout.reps}x`;
    }

    tr.innerHTML = `
        <td>${workout.date}</td>
        <td><small>${workout.muscleGroup || '-'}</small></td>
        <td><strong>${workout.exercise}</strong></td>
        <td>${col4}</td>
        <td>${col5}</td>
        <td>${workout.note || '-'}</td>
        <td><button class="delete-btn" onclick="deleteWorkout(${workout.id})">X</button></td>
    `;
    workoutList.insertBefore(tr, workoutList.firstChild);
}

function saveWorkoutToStorage(workout) {
    let workouts = getWorkoutsFromStorage();
    workouts.push(workout);
    localStorage.setItem('workouts', JSON.stringify(workouts));
}

function getWorkoutsFromStorage() {
    return localStorage.getItem('workouts') ? JSON.parse(localStorage.getItem('workouts')) : [];
}

function loadWorkouts() {
    workoutList.innerHTML = '';
    const workouts = getWorkoutsFromStorage();
    const maxWeights = {};
    workouts.forEach(w => {
        if (!w.isCardio) {
            const exName = w.exercise.toLowerCase();
            const weightNum = parseFloat(w.weight) || 0;
            if (!maxWeights[exName] || weightNum > maxWeights[exName]) maxWeights[exName] = weightNum;
        }
    });

    const setCounts = {};
    workouts.forEach(w => {
        if (!w.isCardio) {
            const key = `${w.date}_${w.exercise.toLowerCase()}`;
            setCounts[key] = (setCounts[key] || 0) + 1;
        }
    });

    const setIndexes = {};
    workouts.forEach(workout => {
        if (currentMuscleFilter !== 'Összes' && workout.muscleGroup !== currentMuscleFilter) {
            return;
        }

        let totalSets = 0, currentSetNum = 1, isPR = false;
        if (!workout.isCardio) {
            const exName = workout.exercise.toLowerCase();
            const key = `${workout.date}_${exName}`;
            totalSets = setCounts[key] || 0;
            setIndexes[key] = (setIndexes[key] || 0) + 1;
            currentSetNum = setIndexes[key];
            const currentWeight = parseFloat(workout.weight) || 0;
            if (currentWeight > 0 && currentWeight === maxWeights[exName]) isPR = true;
        }
        addWorkoutToTable(workout, totalSets, currentSetNum, isPR);
    });

    filterWorkoutsTable();
}

function deleteWorkout(id) {
    let workouts = getWorkoutsFromStorage();
    workouts = workouts.filter(w => w.id !== id);
    localStorage.setItem('workouts', JSON.stringify(workouts));
    loadWorkouts();
    updatePRSummary();
    populateChartExerciseSelect();
    renderCalendar();
}

exportBtn?.addEventListener('click', function() {
    const workouts = getWorkoutsFromStorage();
    if (workouts.length === 0) { alert('Még nincsenek elmentett adatok!'); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workouts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `edzesnaplo_mentes_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

importBtn?.addEventListener('click', () => importFileInput.click());

importFileInput?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                if (confirm(`Biztosan be akarod tölteni ezt a ${importedData.length} edzésbejegyzést?`)) {
                    const currentWorkouts = getWorkoutsFromStorage();
                    const existingIds = new Set(currentWorkouts.map(w => w.id));
                    const newWorkouts = importedData.filter(w => !existingIds.has(w.id));
                    localStorage.setItem('workouts', JSON.stringify([...currentWorkouts, ...newWorkouts]));
                    loadWorkouts();
                    updatePRSummary();
                    populateChartExerciseSelect();
                    renderCalendar();
                    alert('✅ Adatok sikeresen importálva!');
                }
            } else { alert('⚠️ Helytelen fájlformátum!'); }
        } catch (err) { alert('⚠️ Hiba történt a fájl beolvasása közben!'); }
    };
    reader.readAsText(file);
    this.value = '';
});

searchFilterInput?.addEventListener('input', filterWorkoutsTable);

function filterWorkoutsTable() {
    const filterValue = searchFilterInput.value.toLowerCase();
    workoutList.querySelectorAll('tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(filterValue) ? '' : 'none';
    });
}

// --- IDŐZÍTŐ & STOPPER MODÁL LOGIKA ---
let cdInterval = null, cdTotalSeconds = 60;
let swInterval = null, swStartTime = 0, swElapsedTime = 0;

function openTimerModal() {
    document.getElementById('timer-modal').classList.remove('hidden');
}

function closeTimerModal() {
    document.getElementById('timer-modal').classList.add('hidden');
}

window.addEventListener('click', (e) => {
    const timerModal = document.getElementById('timer-modal');
    if (e.target === timerModal) closeTimerModal();
});

function switchTimerTab(tab) {
    const tabTimerBtn = document.getElementById('tab-timer-btn');
    const tabStopwatchBtn = document.getElementById('tab-stopwatch-btn');
    const panelTimer = document.getElementById('panel-timer');
    const panelStopwatch = document.getElementById('panel-stopwatch');

    if (tab === 'timer') {
        tabTimerBtn.classList.add('active');
        tabStopwatchBtn.classList.remove('active');
        panelTimer.classList.remove('hidden');
        panelStopwatch.classList.add('hidden');
    } else {
        tabStopwatchBtn.classList.add('active');
        tabTimerBtn.classList.remove('active');
        panelStopwatch.classList.remove('hidden');
        panelTimer.classList.add('hidden');
    }
}

// --- IDŐZÍTŐ FUNKCIÓK ---
function updateFloatingTimerDisplay() {
    const mins = String(Math.floor(cdTotalSeconds / 60)).padStart(2, '0');
    const secs = String(cdTotalSeconds % 60).padStart(2, '0');
    const timerDisplay = document.getElementById('timer-modal-display');
    if (timerDisplay) timerDisplay.textContent = `${mins}:${secs}`;
    
    // Ikon pulzálása, ha fut az időzítő
    const timerBtns = document.querySelectorAll('.timer-icon-btn');
    timerBtns.forEach(btn => {
        if (cdInterval) btn.classList.add('active-running');
        else btn.classList.remove('active-running');
    });
}

function applyCustomTimer() {
    const minInput = parseInt(document.getElementById('timer-min-input').value) || 0;
    const secInput = parseInt(document.getElementById('timer-sec-input').value) || 0;
    const totalSecs = minInput * 60 + secInput;
    if (totalSecs > 0) {
        resetCountdown();
        cdTotalSeconds = totalSecs;
        updateFloatingTimerDisplay();
    }
}

function setTimerPreset(seconds) {
    if (seconds === 15) {
        cdTotalSeconds += 15;
    } else {
        resetCountdown();
        cdTotalSeconds = seconds;
    }
    document.getElementById('timer-min-input').value = Math.floor(cdTotalSeconds / 60);
    document.getElementById('timer-sec-input').value = cdTotalSeconds % 60;
    updateFloatingTimerDisplay();
}

function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
        setTimeout(() => osc.stop(), 800);
    } catch (e) {}
}

function toggleCountdown() {
    const startBtn = document.getElementById('timer-start-btn');
    if (cdInterval) {
        clearInterval(cdInterval);
        cdInterval = null;
        if (startBtn) startBtn.textContent = 'Indítás';
    } else {
        if (cdTotalSeconds <= 0) applyCustomTimer();
        if (cdTotalSeconds <= 0) cdTotalSeconds = 60;
        
        cdInterval = setInterval(() => {
            cdTotalSeconds--;
            updateFloatingTimerDisplay();
            if (cdTotalSeconds <= 0) {
                clearInterval(cdInterval);
                cdInterval = null;
                if (startBtn) startBtn.textContent = 'Indítás';
                if ('vibrate' in navigator) navigator.vibrate([300, 100, 300, 100, 300]);
                playBeep();
                alert('⏱️ Lejárt a pihenőidő!');
            }
        }, 1000);
        if (startBtn) startBtn.textContent = 'Szünet';
    }
    updateFloatingTimerDisplay();
}

function resetCountdown() {
    clearInterval(cdInterval);
    cdInterval = null;
    applyCustomTimer();
    updateFloatingTimerDisplay();
    const startBtn = document.getElementById('timer-start-btn');
    if (startBtn) startBtn.textContent = 'Indítás';
}

// --- STOPPER FUNKCIÓK ---
function updateStopwatchDisplay() {
    const totalMs = swElapsedTime;
    const mins = String(Math.floor(totalMs / 60000)).padStart(2, '0');
    const secs = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
    const tenths = Math.floor((totalMs % 1000) / 100);
    const swDisplay = document.getElementById('stopwatch-modal-display');
    if (swDisplay) swDisplay.textContent = `${mins}:${secs}.${tenths}`;
}

function toggleStopwatch() {
    const startBtn = document.getElementById('stopwatch-start-btn');
    if (swInterval) {
        clearInterval(swInterval);
        swInterval = null;
        if (startBtn) startBtn.textContent = 'Indítás';
    } else {
        swStartTime = Date.now() - swElapsedTime;
        swInterval = setInterval(() => {
            swElapsedTime = Date.now() - swStartTime;
            updateStopwatchDisplay();
        }, 100);
        if (startBtn) startBtn.textContent = 'Szünet';
    }
}

function resetStopwatch() {
    clearInterval(swInterval);
    swInterval = null;
    swElapsedTime = 0;
    updateStopwatchDisplay();
    const startBtn = document.getElementById('stopwatch-start-btn');
    if (startBtn) startBtn.textContent = 'Indítás';
}

// SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW hiba:', err));
    });
}
