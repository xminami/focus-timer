let startTime = null;
let timerInterval = null;
let pausedTime = 0;
let isPaused = false;
let dailyTotal = 0;
let records = [];
let dailyFocusCount = 0;  // 记录超过25分钟的专注次数
let moodCounts = {
    great: 0,
    good: 0,
    meh: 0,
    bad: 0
};
let monthlyStats = {};
let dailyTracking = {
    wakeup: null,
    sleep: null,
    exercise: 0,
    study: 0
};
let currentTaskType = null;
let totalPausedTime = 0;  // 添加到变量声明部分
let pauseStartTime = null;  // 添加到变量声明部分
let startTimeForDisplay = null;  // 添加新变量用于保存显示用的开始时间

const timer = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const taskInput = document.getElementById('taskInput');
const recordsTable = document.getElementById('recordsTable');
const dailySummary = document.getElementById('dailySummary');
const currentDatetime = document.querySelector('.current-datetime');

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
stopBtn.addEventListener('click', stopTimer);

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (!startTime) {
        startTime = Date.now();
        startTimeForDisplay = new Date();  // 保存用于显示的时间
        timerInterval = setInterval(updateTimer, 1000);
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        if (!currentTaskType) {
            currentTaskType = taskInput.value;
        }
    }
}

function pauseTimer() {
    if (!isPaused) {
        clearInterval(timerInterval);
        isPaused = true;
        pauseBtn.textContent = 'Resume';
    } else {
        // 恢复计时，保持原始开始时间不变
        timerInterval = setInterval(updateTimer, 1000);
        isPaused = false;
        pauseBtn.textContent = 'Pause';
    }
}

function stopTimer() {
    if (startTime) {
        const duration = Date.now() - startTime;
        clearInterval(timerInterval);
        
        // 检查是否有新输入的任务名称
        const inputTask = taskInput.value.trim();
        if (inputTask && (!currentTaskType || currentTaskType === 'Unnamed Task')) {
            currentTaskType = inputTask;
        }
        
        const currentTask = currentTaskType || 'Unnamed Task';  // 保存当前任务名称
        resetTimer(true);  // 重置时保留任务名称
        addRecord(duration);  // 记录数据
        currentTaskType = null;  // 最后再清除任务名称
        taskInput.value = '';
    }
}

function updateTimer() {
    let currentTime;
    if (isPaused) {
        currentTime = pauseStartTime - startTime - totalPausedTime;
    } else {
        if (pauseStartTime) {
            totalPausedTime += Date.now() - pauseStartTime;
            pauseStartTime = null;
        }
        currentTime = Date.now() - startTime - totalPausedTime;
    }
    timer.textContent = formatTime(currentTime);
}

function addRecord(duration) {
    // 再次检查任务输入
    const taskName = currentTaskType || taskInput.value.trim() || 'Unnamed Task';
    const startTimeString = startTimeForDisplay ? 
        startTimeForDisplay.toLocaleTimeString() : 
        new Date(Date.now() - duration).toLocaleTimeString();

    // 创建新记录
    const newRecord = {
        task: taskName,
        startTime: startTimeString,
        duration: formatTime(duration),
        durationMs: duration,
        isLongFocus: duration >= 25 * 60 * 1000,
        type: taskName,  // 使用最终的任务名称
        date: new Date().toLocaleDateString()  // 添加日期字段
    };

    records.unshift(newRecord);

    // 添加到表格的顶部
    const row = recordsTable.insertRow(0);
    const taskCell = row.insertCell(0);
    const startTimeCell = row.insertCell(1);
    const durationCell = row.insertCell(2);

    taskCell.textContent = taskName;
    startTimeCell.textContent = startTimeString;
    durationCell.textContent = formatTime(duration);

    if (duration >= 25 * 60 * 1000) {
        dailyFocusCount++;
        row.style.backgroundColor = '#e8f5e9';
    }

    // 更新统计
    dailyTotal += duration;
    updateMonthlyStats(duration, newRecord);  // 传递记录对象
    updateSummaryCharts();
    saveData();

    console.log('Added record:', newRecord);
}

function updateDailySummary() {
    // 不再需要更新文本显示，因为我们现在使用图表来显示统计信息
    const hours = Math.floor(dailyTotal / (1000 * 60 * 60));
    const minutes = Math.floor((dailyTotal % (1000 * 60 * 60)) / (1000 * 60));
    
    // 直接更新今日图表
    updateTodayChart();
}

function resetTimer(keepTaskName = false) {
    clearInterval(timerInterval);
    startTime = null;
    startTimeForDisplay = null;
    isPaused = false;
    totalPausedTime = 0;
    pauseStartTime = null;
    timer.textContent = '00:00:00';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    
    if (!keepTaskName) {
        taskInput.value = '';
        currentTaskType = null;
    }

    // 保存更新后的状态
    saveData();
}

// 加载保存的数据
function loadSavedData() {
    try {
        const today = new Date().toLocaleDateString();
        let savedData;
        
        // 尝试从主存储加载数据
        const mainData = localStorage.getItem('timerData');
        const backupData = localStorage.getItem('timerData_backup');
        
        if (mainData) {
            savedData = JSON.parse(mainData);
        } else if (backupData) {
            // 如果主存储失败，使用备份数据
            savedData = JSON.parse(backupData);
            // 恢复主存储
            localStorage.setItem('timerData', backupData);
        } else {
            savedData = {};
        }

        // 加载月度统计数据，无论是否是同一天
        monthlyStats = savedData.monthlyStats || {};
        
        if (savedData.date === today) {
            // 如果是同一天，加载当日数据
            dailyTotal = savedData.dailyTotal || 0;
            records = savedData.records || [];
            dailyFocusCount = savedData.dailyFocusCount || 0;
            moodCounts = savedData.moodCounts || {
                great: 0, good: 0, meh: 0, bad: 0
            };
            dailyTracking = savedData.dailyTracking || {
                wakeup: null, sleep: null,
                exercise: 0, study: 0
            };
            
            // 恢复计时状态
            if (savedData.timerState) {
                restoreTimerState(savedData.timerState);
            }
        } else {
            // 如果是新的一天，重置当日数据
            resetDailyData();
        }

        // 更新界面
        updateUI();
        
        return true;
    } catch (error) {
        console.error('Load data error:', error);
        // 如果加载失败，重置所有数据
        resetAllData();
        return false;
    }
}

// 添加新的辅助函数
function resetDailyData() {
    dailyTotal = 0;
    records = [];
    dailyFocusCount = 0;
    moodCounts = {
        great: 0, good: 0, meh: 0, bad: 0
    };
    dailyTracking = {
        wakeup: null, sleep: null,
        exercise: 0, study: 0
    };
}

function resetAllData() {
    resetDailyData();
    monthlyStats = {};
}

function updateUI() {
    updateMoodCounts();
    updateSummaryCharts();
    recordsTable.innerHTML = '';
    
    // 更新记录表格
    records.forEach(record => {
        addRecordToTable(record);
    });
    
    // 更新追踪按钮显示
    updateTrackingDisplay();
    
    // 更新图表
    setTimeout(() => {
        updateMonthlyChart();
        updateSleepChart();
    }, 100);
}

function restoreTimerState(state) {
    startTime = state.startTime;
    startTimeForDisplay = state.startTimeForDisplay ? new Date(state.startTimeForDisplay) : null;
    isPaused = state.isPaused;
    totalPausedTime = state.totalPausedTime;
    pauseStartTime = state.pauseStartTime ? new Date(state.pauseStartTime) : null;
    currentTaskType = state.currentTaskType;
    taskInput.value = state.taskInput || '';

    // 更新按钮状态
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;

    // 重新启动计时器
    if (!isPaused) {
        timerInterval = setInterval(updateTimer, 1000);
    } else {
        pauseBtn.textContent = 'Resume';
    }
}

// 保存数据到本地存储
function saveData() {
    try {
        const data = {
            date: new Date().toLocaleDateString(),
            dailyTotal,
            records,
            dailyFocusCount,
            moodCounts,
            monthlyStats,
            dailyTracking,
            // 添加计时状态
            timerState: startTime ? {
                startTime,
                startTimeForDisplay: startTimeForDisplay?.getTime(),
                isPaused,
                totalPausedTime,
                pauseStartTime: pauseStartTime?.getTime(),
                currentTaskType,
                taskInput: taskInput.value
            } : null,
            // 添加时间戳
            lastSaved: Date.now()
        };

        // 确保当天的记录也保存在月度统计中
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        const currentDay = now.getDate().toString();
        
        if (monthlyStats[currentMonth]?.dailyStats[currentDay]) {
            monthlyStats[currentMonth].dailyStats[currentDay].records = records.map(record => ({
                ...record,
                date: data.date
            }));
        }

        // 保存到 localStorage
        localStorage.setItem('timerData', JSON.stringify(data));
        
        // 额外保存一份备份
        localStorage.setItem('timerData_backup', JSON.stringify(data));
        
        return true;
    } catch (error) {
        console.error('Save data error:', error);
        return false;
    }
}

// 修改 setupMoodButtons 函数
function setupMoodButtons() {
    const moodButtons = document.querySelectorAll('.mood-btn');
    console.log('Found mood buttons:', moodButtons.length); // 检查是否找到按钮
    
    moodButtons.forEach(button => {
        button.onclick = function() {
            const mood = this.dataset.mood;
            moodCounts[mood]++;
            console.log('Updated moodCounts:', moodCounts); // 检查计数是否更新
            
            // 直接更新显示
            const countSpan = document.getElementById(`${mood}-count`);
            console.log('Count element:', countSpan); // 检查是否找到计数元素
            if (countSpan) {
                countSpan.textContent = moodCounts[mood];
                console.log('Updated display for', mood, 'to', moodCounts[mood]);
            }
            
            saveData();  // 保存数据，包括月度统计
            updateMonthlyChart();  // 更新图表显示
            
            // 检查 localStorage
            const savedData = JSON.parse(localStorage.getItem('timerData') || '{}');
            console.log('Saved data:', savedData);
            
            // 动画效果
            this.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        };
    });
}

// 修改 updateMoodCounts 函数
function updateMoodCounts() {
    Object.keys(moodCounts).forEach(mood => {
        const countSpan = document.getElementById(`${mood}-count`);
        if (countSpan) {
            countSpan.textContent = moodCounts[mood];
        }
    });
}

// 修改 updateMonthlyStats 函数
function updateMonthlyStats(duration, record) {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const currentDay = now.getDate().toString();
    
    // 确保月度数据结构存在
    if (!monthlyStats[currentMonth]) {
        monthlyStats[currentMonth] = {
            dailyStats: {}
        };
    }
    
    // 确保当日数据结构存在
    if (!monthlyStats[currentMonth].dailyStats[currentDay]) {
        monthlyStats[currentMonth].dailyStats[currentDay] = {
            totalTime: 0,
            focusCount: 0,
            exerciseTime: 0,
            studyTime: 0,
            otherTime: 0,
            records: [],
            sleep: dailyTracking.sleep,
            wakeup: dailyTracking.wakeup
        };
    }
    
    const dayStats = monthlyStats[currentMonth].dailyStats[currentDay];
    
    // 更新统计数据
    dayStats.totalTime += duration;
    if (duration >= 25 * 60 * 1000) {
        dayStats.focusCount++;
    }
    
    // 根据任务类型更新相应的时间
    if (currentTaskType === 'Exercise') {
        dayStats.exerciseTime += duration;
    } else if (currentTaskType === 'Study') {
        dayStats.studyTime += duration;
    } else {
        dayStats.otherTime += duration;
    }

    // 保存记录
    if (record) {
        dayStats.records = dayStats.records || [];
        dayStats.records.push(record);
    }
    
    // 更新睡眠时间
    dayStats.sleep = dailyTracking.sleep;
    dayStats.wakeup = dailyTracking.wakeup;
    
    saveData();
}

// 修改 updateMonthlyChart 函数，添加心情统计显示
function updateMonthlyChart() {
    // 检查 Chart 是否已加载
    if (typeof Chart === 'undefined') {
        console.log('Chart.js not loaded yet');
        return;
    }

    const ctx = document.getElementById('monthlyChart');
    if (!ctx) {
        console.log('Chart canvas not found');
        return;
    }
    
    try {
        // 如果已经存在图表，先销毁它
        if (window.monthlyChart && typeof window.monthlyChart.destroy === 'function') {
            window.monthlyChart.destroy();
        }

        const now = new Date(localStorage.getItem('timerData') ? JSON.parse(localStorage.getItem('timerData')).date : new Date());
        const currentMonth = now.toISOString().slice(0, 7);
        console.log('Current month:', currentMonth);  // 调试输出
        const monthData = monthlyStats[currentMonth] || { dailyStats: {} };
        console.log('Month data:', monthData);  // 调试输出
        
        // 获取当月第一天的日期
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // 获取当月天数
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        
        // 获取每天是星期几
        const weekdays = days.map(day => {
            const date = new Date(now.getFullYear(), now.getMonth(), day);
            return date.getDay(); // 0 是周日，1-6 是周一到周六
        });

        // 获取每种类型的专注时间数据（小时）
        const exerciseData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || {};
            const time = dayStats.exerciseTime || 0;
            return time > 0 ? time / (1000 * 60 * 60) : 0;
        });
        
        const studyData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || {};
            const time = dayStats.studyTime || 0;
            return time > 0 ? time / (1000 * 60 * 60) : 0;
        });
        
        const otherData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || {};
            const time = dayStats.otherTime || 0;
            return time > 0 ? time / (1000 * 60 * 60) : 0;
        });

        const focusData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || {};
            return dayStats.focusCount || 0;
        });

        window.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Exercise',
                        data: exerciseData,
                        backgroundColor: 'rgba(255, 145, 85, 0.7)',  // 温暖的橙色
                        borderColor: 'rgba(255, 145, 85, 1)',
                        borderWidth: 1,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Study',
                        data: studyData,
                        backgroundColor: 'rgba(100, 181, 246, 0.7)',  // 清爽的蓝色
                        borderColor: 'rgba(100, 181, 246, 1)',
                        borderWidth: 1,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Other Focus',
                        data: otherData,
                        backgroundColor: 'rgba(156, 204, 101, 0.7)',  // 柔和的绿色
                        borderColor: 'rgba(156, 204, 101, 1)',
                        borderWidth: 1,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Effective Sessions',
                        data: focusData,
                        type: 'line',
                        backgroundColor: 'rgba(171, 71, 188, 0.2)',  // 淡紫色
                        borderColor: 'rgba(171, 71, 188, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        ticks: {
                            stepSize: 1,
                            color: function(context) {
                                if (!context || typeof context.index === 'undefined') return 'rgba(0, 0, 0, 0.8)';
                                const weekday = weekdays[context.index];
                                return (weekday === 0 || weekday === 6) ? 
                                    'rgba(255, 145, 85, 1)' : 
                                    'rgba(0, 0, 0, 0.8)';
                            },
                            font: function(context) {
                                if (!context || typeof context.index === 'undefined') return { weight: 'normal' };
                                const weekday = weekdays[context.index];
                                return {
                                    weight: (weekday === 0 || weekday === 6) ? 'bold' : 'normal'
                                };
                            }
                        },
                        grid: {
                            color: function(context) {
                                if (!context || typeof context.index === 'undefined') return 'rgba(0, 0, 0, 0.1)';
                                const weekday = weekdays[context.index];
                                return (weekday === 0 || weekday === 6) ? 
                                    'rgba(255, 145, 85, 0.1)' : 
                                    'rgba(0, 0, 0, 0.1)';
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Focus Time (hours)'
                        },
                        min: 0,
                        ticks: {
                            callback: value => value.toFixed(1) + 'h'
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Effective Sessions'
                        },
                        min: 0,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Statistics'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.type === 'line') {
                                    return `${context.dataset.label}: ${context.raw}`;
                                }
                                return `${context.dataset.label}: ${context.raw.toFixed(1)}h`;
                            }
                        }
                    }
                }
            }
        });

        // 修改心情统计显示
        if (monthData && monthData.dailyMoods) {
            const moodEmojis = {
                great: '😊',
                good: '🙂',
                meh: '😐',
                bad: '😞'
            };

            const moodStatsHtml = `
                <div class="mood-stats">
                    <h3>Monthly Mood Records</h3>
                    <ul>
                        ${Object.entries(monthData.dailyMoods)
                            .map(([day, {mood, count}]) => 
                                `<li>Day ${day}: ${moodEmojis[mood]} (${count} times)</li>`
                            )
                            .join('')}
                    </ul>
                </div>
            `;
            
            // 在图表下方显示心情统计
            const chartContainer = document.querySelector('.chart-container');
            let moodStatsDiv = document.querySelector('.mood-stats');
            if (!moodStatsDiv) {
                chartContainer.insertAdjacentHTML('afterend', moodStatsHtml);
            } else {
                moodStatsDiv.outerHTML = moodStatsHtml;
            }
        }
    } catch (error) {
        console.error('Error updating chart:', error);
    }

    // 更新其他图表
    updateSleepChart();
}

// 更新睡眠时间图表
function updateSleepChart() {
    const ctx = document.getElementById('sleepChart');
    if (!ctx) return;

    if (window.sleepChart instanceof Chart) {
        window.sleepChart.destroy();
    }

    const now = new Date(localStorage.getItem('timerData') ? JSON.parse(localStorage.getItem('timerData')).date : new Date());
    const currentMonth = now.toISOString().slice(0, 7);
    const monthData = monthlyStats[currentMonth] || { dailyStats: {} };
    
    // 获取当月天数
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // 获取每天是星期几
    const weekdays = days.map(day => {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        return date.getDay(); // 0 是周日，1-6 是周一到周六
    });

    // 处理所有日期的数据，包括没有记录的日期
    const sleepData = days.map(day => {
        const dayStats = monthData.dailyStats[day.toString()] || {};
        
        // 如果没有睡眠数据，返回空数据但保留日期
        if (!dayStats.sleep || !dayStats.wakeup) {
            return {
                x: day,
                y: null,
                duration: null
            };
        }
        
        let sleepTime = timeToMinutes(dayStats.sleep);
        let wakeTime = timeToMinutes(dayStats.wakeup);
        
        // 调整时间以12点为基准
        if (sleepTime < 12 * 60) sleepTime += 24 * 60;
        if (wakeTime < 12 * 60) wakeTime += 24 * 60;
        
        // 计算睡眠时长（小时）
        let duration = (wakeTime - sleepTime) / 60;
        if (duration < 0) duration += 24;
        
        return {
            x: day,
            y: [sleepTime - 12 * 60, wakeTime - 12 * 60],
            duration: duration
        };
    });

    window.sleepChart = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [
                {
                    label: 'Sleep Period',
                    data: sleepData,
                    backgroundColor: 'rgba(103, 58, 183, 0.5)',
                    borderColor: 'rgba(103, 58, 183, 1)',
                    borderWidth: 1,
                    barPercentage: 0.8
                },
                {
                    label: 'Sleep Duration',
                    data: sleepData.filter(d => d.duration !== null).map(d => ({
                        x: d.x,
                        y: d.duration
                    })),
                    type: 'line',
                    yAxisID: 'duration',
                    borderColor: 'rgba(255, 87, 34, 0.8)',
                    backgroundColor: 'rgba(255, 87, 34, 0.1)',
                    borderWidth: 2,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 24 * 60,
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    ticks: {
                        callback: value => {
                            const totalHours = Math.floor(value / 60) + 12;
                            const hours = totalHours % 24;
                            return `${hours.toString().padStart(2, '0')}:00`;
                        },
                        stepSize: 60
                    }
                },
                duration: {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 12,
                    title: {
                        display: true,
                        text: 'Sleep Duration (hours)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    type: 'linear',
                    min: 1,
                    max: daysInMonth,
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        stepSize: 1,
                        callback: value => Math.floor(value),
                        color: function(context) {
                            if (!context || typeof context.index === 'undefined') return 'rgba(0, 0, 0, 0.8)';
                            const weekday = weekdays[context.index];
                            return (weekday === 0 || weekday === 6) ? 
                                'rgba(255, 145, 85, 1)' : 
                                'rgba(0, 0, 0, 0.8)';
                        },
                        font: function(context) {
                            if (!context || typeof context.index === 'undefined') return { weight: 'normal' };
                            const weekday = weekdays[context.index];
                            return {
                                weight: (weekday === 0 || weekday === 6) ? 'bold' : 'normal'
                            };
                        }
                    },
                    grid: {
                        color: function(context) {
                            if (!context || typeof context.index === 'undefined') return 'rgba(0, 0, 0, 0.1)';
                            const weekday = weekdays[context.index];
                            return (weekday === 0 || weekday === 6) ? 
                                'rgba(255, 145, 85, 0.1)' : 
                                'rgba(0, 0, 0, 0.1)';
                        }
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sleep Schedule'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const data = context.raw;
                            if (context.dataset.label === 'Sleep Duration') {
                                return `Duration: ${data.y}h`;
                            }
                            if (!data.y) return 'No sleep data';
                            
                            const [start, end] = data.y;
                            const startHour = Math.floor((start + 12 * 60) / 60) % 24;
                            const startMin = (start + 12 * 60) % 60;
                            const endHour = Math.floor((end + 12 * 60) / 60) % 24;
                            const endMin = (end + 12 * 60) % 60;
                            return `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
                        }
                    }
                }
            }
        }
    });
}

// 辅助函数：将时间字符串转换为分钟数
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// 保留导出/导入功能
function exportData() {
    try {
        // 准备导出数据
        const data = {
            date: new Date().toLocaleDateString(),
            dailyTotal,
            records,
            dailyFocusCount,
            moodCounts,
            monthlyStats,
            dailyTracking
        };

        // 导出 JSON
        const jsonString = JSON.stringify(data, null, 2);
        const jsonBlob = new Blob([jsonString], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = `focus-timer-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(jsonLink);
        jsonLink.click();
        document.body.removeChild(jsonLink);

        // 准备 CSV 数据
        let csvContent = '\ufeff';  // 添加 BOM 以支持中文
        csvContent += 'Date,Task,Start Time,Duration,Is Long Focus,Type\n';
        
        // 收集所有记录
        const allRecords = [];
        
        // 从 monthlyStats 中收集所有记录
        Object.entries(monthlyStats).forEach(([month, monthData]) => {
            Object.entries(monthData.dailyStats || {}).forEach(([day, dayData]) => {
                if (dayData.records && Array.isArray(dayData.records)) {
                    dayData.records.forEach(record => {
                        allRecords.push({
                            date: `${month}-${day.padStart(2, '0')}`,
                            ...record
                        });
                    });
                }
            });
        });

        // 添加今天的记录
        records.forEach(record => {
            if (!record.date) {
                record.date = new Date().toLocaleDateString();
            }
            allRecords.push(record);
        });

        console.log('All records to export:', allRecords);  // 调试输出

        // 按日期排序
        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 写入CSV
        allRecords.forEach(record => {
            const row = [
                record.date,
                `"${(record.task || '').replace(/"/g, '""')}"`,
                `"${record.startTime || ''}"`,
                `"${record.duration || ''}"`,
                record.isLongFocus || false,
                `"${record.type || ''}"`
            ].join(',');
            csvContent += row + '\n';
        });

        // 导出 CSV
        const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `focus-timer-records-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);

        // 清理 URL 对象
        setTimeout(() => {
            URL.revokeObjectURL(jsonUrl);
            URL.revokeObjectURL(csvUrl);
        }, 100);

    } catch (error) {
        console.error('Export error:', error);
        alert('Export failed: ' + error.message);
    }
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // 验证数据格式
            if (!importedData.monthlyStats) {
                throw new Error('Invalid data structure: missing monthlyStats');
            }

            // 保存数据到 localStorage，保持原有的月度数据结构
            const today = new Date().toLocaleDateString();
            const currentData = {
                date: today,
                dailyTotal: 0,
                records: [],
                dailyFocusCount: 0,
                moodCounts: {
                    great: 0, good: 0, meh: 0, bad: 0
                },
                monthlyStats: importedData.monthlyStats,  // 直接使用导入的月度数据
                dailyTracking: {
                    wakeup: null, sleep: null,
                    exercise: 0, study: 0
                }
            };

            localStorage.setItem('timerData', JSON.stringify(currentData));
            console.log('Imported data:', currentData);

            // 重新加载数据
            loadSavedData();
            
            // 强制更新图表
            setTimeout(() => {
                updateMonthlyChart();
                updateSleepChart();
                updateSummaryCharts();
            }, 100);
            
            alert('Data imported successfully!');
        } catch (error) {
            console.error('Import error:', error);
            alert('Import failed: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// 添加自动重置功能
function setupAutoReset() {
    // 计算距离下一个凌晨0点的毫秒数
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeToMidnight = tomorrow - now;

    // 设置定时器
    setTimeout(() => {
        // 重置数据
        localStorage.removeItem('timerData');
        dailyFocusCount = 0;
        moodCounts = {
            great: 0,
            good: 0,
            meh: 0,
            bad: 0
        };
        
        // 更新显示
        updateMoodCounts();
        updateSummaryCharts();
        recordsTable.innerHTML = '';
        
        // 设置下一天的定时器
        setupAutoReset();
    }, timeToMidnight);
}

// 更新日期时间显示
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'short',    // 'long' -> 'short'
        month: 'short',      // 'long' -> 'short'
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false        // 使用24小时制
    };
    currentDatetime.textContent = now.toLocaleDateString('en-US', options);
}

// 修改 setupTrackingButtons 函数
function setupTrackingButtons() {
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const now = new Date();
            
            switch(type) {
                case 'wakeup':
                case 'sleep':
                    const timeStr = now.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    dailyTracking[type] = timeStr;
                    document.getElementById(`${type}-time`).textContent = timeStr;
                    break;
                case 'exercise':
                case 'study':
                    if (!startTime) {
                        // 先设置任务名称（在所有操作之前）
                        const taskName = type === 'exercise' ? 'Exercise' : 'Study';
                        currentTaskType = taskName;
                        taskInput.value = taskName;

                        // 停止任何现有的计时器
                        if (timerInterval) {
                            clearInterval(timerInterval);
                        }
                        
                        // 重置计时器状态（但保留任务名称）
                        startTime = Date.now();
                        startTimeForDisplay = new Date();
                        isPaused = false;
                        totalPausedTime = 0;
                        pauseStartTime = null;
                        timer.textContent = '00:00:00';
                        
                        // 更新计数
                        dailyTracking[type]++;
                        document.getElementById(`${type}-count`).textContent = dailyTracking[type];
                        
                        // 启动计时器
                        timerInterval = setInterval(updateTimer, 1000);
                        
                        // 更新按钮状态
                        startBtn.disabled = true;
                        pauseBtn.disabled = false;
                        stopBtn.disabled = false;
                        
                        console.log('Starting new session:', {
                            type: type,
                            taskName: currentTaskType,
                            startTime: startTimeForDisplay
                        });
                        
                        // 保存当前状态
                        saveData();
                    } else {
                        alert('Please finish current focus session first');
                    }
                    break;
            }
            
            updateMonthlyChart();
        });
    });
}

// 修改 DOMContentLoaded 事件处理
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    setupMoodButtons();
    setupTrackingButtons();
    setupAutoReset();
    
    // 添加时间更新
    updateDateTime();  // 立即执行一次
    setInterval(updateDateTime, 1000);  // 每秒更新
});

function updateSummaryCharts() {
    // 更新今日数据
    const todayHours = Math.floor(dailyTotal / (1000 * 60 * 60));
    const todayMinutes = Math.floor((dailyTotal % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('today-focus').textContent = `${todayHours}h ${todayMinutes}m`;
    document.getElementById('today-sessions').textContent = dailyFocusCount;

    // 获取本周数据
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthData = monthlyStats[currentMonth]?.dailyStats || {};
    
    // 计算本周数据
    const today = now.getDate();
    const dayOfWeek = now.getDay();
    const weekStart = today - dayOfWeek;
    let weekFocusTime = 0;
    let weekSessions = 0;
    
    for (let i = 0; i < 7; i++) {
        const day = weekStart + i;
        const dayStats = monthData[day] || {};
        weekFocusTime += dayStats.totalTime || 0;
        weekSessions += dayStats.focusCount || 0;
    }
    
    const weekHours = Math.floor(weekFocusTime / (1000 * 60 * 60));
    const weekMinutes = Math.floor((weekFocusTime % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('week-focus').textContent = `${weekHours}h ${weekMinutes}m`;
    document.getElementById('week-sessions').textContent = weekSessions;

    // 计算月度总计
    let monthFocusTime = 0;
    let monthSessions = 0;
    Object.values(monthData).forEach(day => {
        monthFocusTime += day.totalTime || 0;
        monthSessions += day.focusCount || 0;
    });
    
    const monthHours = Math.floor(monthFocusTime / (1000 * 60 * 60));
    const monthMinutes = Math.floor((monthFocusTime % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('month-focus').textContent = `${monthHours}h ${monthMinutes}m`;
    document.getElementById('month-sessions').textContent = monthSessions;
}