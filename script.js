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
    wakeup: null,  // 改回单个时间值
    sleep: null,   // 改回单个时间值
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
        // 暂停计时器
        clearInterval(timerInterval);
        isPaused = true;
        pauseStartTime = Date.now();  // 记录暂停开始时间
        pauseBtn.textContent = 'Resume';
        pauseBtn.classList.remove('pause-btn');
        pauseBtn.classList.add('resume-btn');
    } else {
        // 恢复计时
        if (pauseStartTime) {
            totalPausedTime += Date.now() - pauseStartTime;  // 累加暂停时间
            pauseStartTime = null;  // 清除暂停开始时间
        }
        timerInterval = setInterval(updateTimer, 1000);
        isPaused = false;
        pauseBtn.textContent = 'Pause';
        pauseBtn.classList.remove('resume-btn');
        pauseBtn.classList.add('pause-btn');
    }
    // 保存状态
    saveData();
}

function stopTimer() {
    if (startTime) {
        // 计算实际持续时间
        const currentTime = Date.now();
        const duration = currentTime - startTime - totalPausedTime;
        
        // 清除计时器
        clearInterval(timerInterval);
        timerInterval = null;
        
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

let lastSaveTime = 0;
const SAVE_INTERVAL = 1000; // 每秒保存一次

function updateTimer() {
    try {
        if (!startTime) return;

        const now = Date.now();
        let currentTime;

        if (isPaused) {
            // 如果是暂停状态，使用暂停时的时间
            currentTime = pauseStartTime - startTime - totalPausedTime;
        } else {
            // 如果是运行状态
            if (pauseStartTime) {
                // 如果有未处理的暂停时间，先处理
                totalPausedTime += now - pauseStartTime;
                pauseStartTime = null;
            }
            currentTime = now - startTime - totalPausedTime;
        }
        
        currentTime = Math.max(0, currentTime);
        timer.textContent = formatTime(currentTime);

        // 限制保存频率
        if (now - lastSaveTime >= SAVE_INTERVAL) {
            saveData();
            lastSaveTime = now;
        }

        // 调试输出
        console.log('Timer state:', {
            isPaused,
            currentTime: formatTime(currentTime),
            totalPausedTime: formatTime(totalPausedTime),
            pauseStartTime: pauseStartTime ? new Date(pauseStartTime).toISOString() : null
        });
    } catch (error) {
        console.error('Error in updateTimer:', error);
        resetTimer();
    }
}

function addRecord(duration) {
    // 再次检查任务输入
    const taskName = currentTaskType || taskInput.value.trim() || 'Unnamed Task';
    const startTimeString = startTimeForDisplay ? 
        startTimeForDisplay.toLocaleTimeString() : 
        new Date(Date.now() - duration).toLocaleTimeString();

    // 创建新记录，使用 ISO 格式的日期
    const newRecord = {
        task: taskName,
        startTime: startTimeString,
        duration: formatTime(duration),
        durationMs: duration,
        isLongFocus: duration >= 25 * 60 * 1000,
        type: taskName,
        date: new Date().toISOString().slice(0, 10)  // 使用 ISO 格式 YYYY-MM-DD
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
    pauseBtn.classList.remove('resume-btn');
    pauseBtn.classList.add('pause-btn');
    
    if (!keepTaskName) {
        taskInput.value = '';
        currentTaskType = null;
    }

    // 保存更新后的状态
    saveData();
}

function saveData() {
    try {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        const currentDay = now.getDate().toString();
        
        // 确保月度统计结构存在
        if (!monthlyStats[currentMonth]) {
            monthlyStats[currentMonth] = { dailyStats: {} };
        }
        if (!monthlyStats[currentMonth].dailyStats[currentDay]) {
            monthlyStats[currentMonth].dailyStats[currentDay] = {};
        }

        // 更新月度统计中的睡眠数据
        const dayStats = monthlyStats[currentMonth].dailyStats[currentDay];
        // 只有在有值时才更新，避免覆盖已有数据
        if (dailyTracking.sleep) dayStats.sleep = dailyTracking.sleep;
        if (dailyTracking.wakeup) dayStats.wakeup = dailyTracking.wakeup;
        dayStats.exercise = dailyTracking.exercise || 0;
        dayStats.study = dailyTracking.study || 0;

        // 准备保存的数据
        const today = now.toISOString().slice(0, 10);
        records.forEach(record => {
            if (!record.date) {
                record.date = today;
            }
        });

        const data = {
            date: today,
            dailyTotal,
            records,
            dailyFocusCount,
            moodCounts,
            monthlyStats,
            dailyTracking,
            timerState: startTime ? {
                startTime: Number(startTime),
                startTimeForDisplay: startTimeForDisplay?.getTime(),
                isPaused,
                totalPausedTime: Number(totalPausedTime),
                pauseStartTime: pauseStartTime?.getTime(),
                currentTaskType,
                taskInput: taskInput.value
            } : null
        };

        localStorage.setItem('timerData', JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Save data error:', error);
        return false;
    }
}

function loadSavedData() {
    try {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const currentMonth = now.toISOString().slice(0, 7);
        const currentDay = now.getDate().toString();
        
        const savedDataStr = localStorage.getItem('timerData');
        if (!savedDataStr) {
            console.log('No saved data found');
            resetAllData();
            return false;
        }

        const savedData = JSON.parse(savedDataStr);
        console.log('Loading data:', {
            savedDate: savedData.date,
            currentDate: today,
            recordsCount: savedData.records?.length || 0,
            dailyTracking: savedData.dailyTracking,
            monthlyStats: savedData.monthlyStats?.[currentMonth]?.dailyStats?.[currentDay]
        });

        // 加载月度统计数据
        monthlyStats = savedData.monthlyStats || {};

        // 从月度统计中获取今天的数据
        const dayStats = monthlyStats[currentMonth]?.dailyStats[currentDay] || {};

        if (savedData.date === today) {
            // 同一天，加载所有数据
            records = savedData.records || [];
            dailyTotal = savedData.dailyTotal || 0;
            dailyFocusCount = savedData.dailyFocusCount || 0;
            moodCounts = savedData.moodCounts || {
                great: 0, good: 0, meh: 0, bad: 0
            };
            
            // 加载 dailyTracking 数据，优先使用 savedData 中的数据
            dailyTracking = {
                wakeup: savedData.dailyTracking?.wakeup || dayStats.wakeup || null,
                sleep: savedData.dailyTracking?.sleep || dayStats.sleep || null,
                exercise: savedData.dailyTracking?.exercise || 0,
                study: savedData.dailyTracking?.study || 0
            };

            if (savedData.timerState) {
                restoreTimerState(savedData.timerState);
            }
        } else {
            // 新的一天，但保留月度统计中的数据
            resetDailyData();
            // 从月度统计中恢复今天的睡眠数据
            if (dayStats) {
                dailyTracking.wakeup = dayStats.wakeup || null;
                dailyTracking.sleep = dayStats.sleep || null;
            }
        }

        // 确保月度统计中的数据是最新的
        if (!monthlyStats[currentMonth]) {
            monthlyStats[currentMonth] = { dailyStats: {} };
        }
        if (!monthlyStats[currentMonth].dailyStats[currentDay]) {
            monthlyStats[currentMonth].dailyStats[currentDay] = {};
        }
        
        // 更新月度统计中的数据
        const currentDayStats = monthlyStats[currentMonth].dailyStats[currentDay];
        if (dailyTracking.wakeup) currentDayStats.wakeup = dailyTracking.wakeup;
        if (dailyTracking.sleep) currentDayStats.sleep = dailyTracking.sleep;

        updateUI();
        // 保存以确保数据同步
        saveData();
        return true;
    } catch (error) {
        console.error('Load data error:', error);
        resetAllData();
        return false;
    }
}

function resetDailyData() {
    dailyTotal = 0;
    records = [];
    recordsTable.innerHTML = '';
    dailyFocusCount = 0;
    moodCounts = {
        great: 0, good: 0, meh: 0, bad: 0
    };
    dailyTracking = {
        wakeup: null,
        sleep: null,
        exercise: 0,
        study: 0
    };
}

function resetAllData() {
    resetDailyData();
    monthlyStats = {};
}

function updateUI() {
    // 清空表格后再添加记录
    recordsTable.innerHTML = '';
    if (records && records.length > 0) {
        records.forEach(record => {
            addRecordToTable(record);
        });
    }
    
    updateMoodCounts();
    updateTrackingDisplay();
    updateSummaryCharts();
    
    // 更新图表
    setTimeout(() => {
        updateMonthlyChart();
        updateSleepChart();
    }, 100);
}

function restoreTimerState(state) {
    try {
        // 恢复基本状态
        startTime = Number(state.startTime);  // 确保是数字
        startTimeForDisplay = state.startTimeForDisplay ? new Date(state.startTimeForDisplay) : null;
        isPaused = state.isPaused;
        totalPausedTime = Number(state.totalPausedTime || 0);  // 确保是数字
        pauseStartTime = state.pauseStartTime ? new Date(state.pauseStartTime) : null;
        currentTaskType = state.currentTaskType;
        taskInput.value = state.taskInput || '';

        // 更新按钮状态
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;

        // 如果计时器正在运行，重新启动它
        if (!isPaused) {
            // 清除任何现有的计时器
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            // 计算已经过去的时间并更新总暂停时间
            if (pauseStartTime) {
                totalPausedTime += Date.now() - pauseStartTime;
                pauseStartTime = null;
            }
            
            // 立即更新一次显示
            updateTimer();
            
            // 启动新的计时器
            timerInterval = setInterval(updateTimer, 1000);
            pauseBtn.textContent = 'Pause';
        } else {
            // 如果是暂停状态，更新按钮文本
            pauseBtn.textContent = 'Resume';
            // 确保显示正确的时间
            updateTimer();
        }

        console.log('Timer state restored:', {
            startTime,
            isPaused,
            totalPausedTime,
            currentTaskType,
            elapsedTime: Date.now() - startTime - totalPausedTime
        });
    } catch (error) {
        console.error('Error restoring timer state:', error);
        // 如果恢复失败，重置计时器
        resetTimer();
    }
}

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

function updateMoodCounts() {
    Object.keys(moodCounts).forEach(mood => {
        const countSpan = document.getElementById(`${mood}-count`);
        if (countSpan) {
            countSpan.textContent = moodCounts[mood];
        }
    });
}

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
        // 正确处理图表销毁
        if (window.monthlyChart && typeof window.monthlyChart.destroy === 'function') {
            window.monthlyChart.destroy();
        } else {
            window.monthlyChart = null;
        }

        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);  // YYYY-MM
        console.log('Current month:', currentMonth);
        
        const monthData = monthlyStats[currentMonth] || { dailyStats: {} };
        console.log('Month data:', monthData);
        
        // 获取当月天数
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        
        // 获取每天是星期几
        const weekdays = days.map(day => {
            const date = new Date(now.getFullYear(), now.getMonth(), day);
            return date.getDay();
        });

        // 获取每种类型的专注时间数据（小时）
        const exerciseData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || {};
            const time = dayStats.exerciseTime || 0;
            return time / (1000 * 60 * 60);  // 转换为小时
        });
        
        const studyData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || {};
            const time = dayStats.studyTime || 0;
            return time / (1000 * 60 * 60);  // 转换为小时
        });
        
        const otherData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || {};
            const time = dayStats.otherTime || 0;
            return time / (1000 * 60 * 60);  // 转换为小时
        });

        const focusData = days.map(day => {
            const dayStats = monthData.dailyStats[day.toString()] || {};
            return dayStats.focusCount || 0;
        });

        console.log('Exercise data:', exerciseData);
        console.log('Study data:', studyData);
        console.log('Other data:', otherData);
        console.log('Focus data:', focusData);

        window.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Exercise',
                        data: exerciseData,
                        backgroundColor: 'rgba(255, 145, 85, 0.7)',
                        borderColor: 'rgba(255, 145, 85, 1)',
                        borderWidth: 1,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Study',
                        data: studyData,
                        backgroundColor: 'rgba(100, 181, 246, 0.7)',
                        borderColor: 'rgba(100, 181, 246, 1)',
                        borderWidth: 1,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Other Focus',
                        data: otherData,
                        backgroundColor: 'rgba(156, 204, 101, 0.7)',
                        borderColor: 'rgba(156, 204, 101, 1)',
                        borderWidth: 1,
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Effective Sessions',
                        data: focusData,
                        type: 'line',
                        backgroundColor: 'rgba(171, 71, 188, 0.2)',
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
                                const weekday = weekdays[context.index];
                                return (weekday === 0 || weekday === 6) ? 
                                    'rgba(255, 145, 85, 1)' : 
                                    'rgba(0, 0, 0, 0.8)';
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
                }
            }
        });
    } catch (error) {
        console.error('Error updating monthly chart:', error);
        console.error('Error details:', error.stack);
    }
}

function updateSleepChart() {
    const ctx = document.getElementById('sleepChart');
    if (!ctx) return;

    // 正确处理图表销毁
    if (window.sleepChart && typeof window.sleepChart.destroy === 'function') {
        window.sleepChart.destroy();
    } else {
        window.sleepChart = null;
    }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);  // YYYY-MM
    const monthData = monthlyStats[currentMonth] || { dailyStats: {} };
    
    // 获取当月天数
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // 获取每天是星期几
    const weekdays = days.map(day => {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        return date.getDay(); // 0 是周日，1-6 是周一到周六
    });

    // 在处理时间数据时添加错误检查
    const sleepData = Object.entries(monthData).map(([day, data]) => {
        if (!data.sleep || !data.wakeup) return null;
        try {
            return {
                day: parseInt(day),
                sleep: data.sleep,
                wakeup: data.wakeup,
                duration: calculateDuration(data.sleep, data.wakeup)
            };
        } catch (error) {
            console.error('Error processing sleep data for day:', day, error);
            return null;
        }
    }).filter(data => data !== null);  // 过滤掉无效数据

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

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    try {
        // 处理 "HH:MM" 格式
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    } catch (error) {
        console.error('Error parsing time:', timeStr, error);
        return 0;
    }
}

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

            // 获取当前日期，使用 YYYY-MM-DD 格式
            const now = new Date();
            const today = now.toISOString().slice(0, 10);
            
            // 准备要保存的数据
            const currentData = {
                date: today,  // 使用标准格式
                dailyTotal: 0,
                records: [],
                dailyFocusCount: 0,
                moodCounts: {
                    great: 0, good: 0, meh: 0, bad: 0
                },
                monthlyStats: importedData.monthlyStats,
                dailyTracking: {
                    wakeup: null,
                    sleep: null,
                    exercise: 0,
                    study: 0
                }
            };

            // 更新全局变量
            monthlyStats = importedData.monthlyStats;

            // 保存到 localStorage
            localStorage.setItem('timerData', JSON.stringify(currentData));
            console.log('Imported data:', currentData);

            // 确保在 DOM 更新后再更新图表
            setTimeout(() => {
                const currentMonth = today.slice(0, 7);  // YYYY-MM
                console.log('Updating charts for month:', currentMonth);
                console.log('Available data:', monthlyStats[currentMonth]);

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
                    // 直接覆盖之前的记录
                    dailyTracking[type] = timeStr;
                    document.getElementById(`${type}-time`).textContent = timeStr;

                    // 如果是起床时间且有睡眠时间，计算睡眠时长
                    if (type === 'wakeup' && dailyTracking.sleep) {
                        const duration = calculateDuration(dailyTracking.sleep, timeStr);
                        console.log(`Sleep duration: ${duration} hours`);
                    }
                    
                    // 立即保存数据
                    saveData();
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
    
    // 计算本周数据（以周一为开始）
    const today = now.getDate();
    let dayOfWeek = now.getDay();  // 0 是周日，1-6 是周一到周六
    // 调整为以周一为开始（0-6 代表周一到周日）
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = today - dayOfWeek;  // 现在从周一开始计算
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

function updateTrackingDisplay() {
    // 更新唤醒时间
    const wakeupTime = document.getElementById('wakeup-time');
    if (wakeupTime) {
        wakeupTime.textContent = dailyTracking.wakeup || '--:--';
    }

    // 更新睡眠时间
    const sleepTime = document.getElementById('sleep-time');
    if (sleepTime) {
        sleepTime.textContent = dailyTracking.sleep || '--:--';
    }

    // 更新运动次数
    const exerciseCount = document.getElementById('exercise-count');
    if (exerciseCount) {
        exerciseCount.textContent = dailyTracking.exercise || '0';
    }

    // 更新学习次数
    const studyCount = document.getElementById('study-count');
    if (studyCount) {
        studyCount.textContent = dailyTracking.study || '0';
    }
}

function addRecordToTable(record) {
    // 创建新行
    const row = recordsTable.insertRow(0);
    
    // 添加单元格
    const taskCell = row.insertCell(0);
    const startTimeCell = row.insertCell(1);
    const durationCell = row.insertCell(2);

    // 填充数据
    taskCell.textContent = record.task;
    startTimeCell.textContent = record.startTime;
    durationCell.textContent = record.duration;

    // 如果是长时间专注，添加高亮
    if (record.isLongFocus) {
        row.style.backgroundColor = '#e8f5e9';
    }
}

// 修改 calculateDuration 函数，添加更多错误处理
function calculateDuration(sleepTimeStr, wakeTimeStr) {
    if (!sleepTimeStr || !wakeTimeStr) {
        console.log('Missing time values:', { sleep: sleepTimeStr, wake: wakeTimeStr });
        return 0;
    }

    try {
        const sleepTime = timeToMinutes(sleepTimeStr);
        const wakeTime = timeToMinutes(wakeTimeStr);

        // 调整时间以12点为基准
        let adjustedSleepTime = sleepTime;
        let adjustedWakeTime = wakeTime;

        if (sleepTime < 12 * 60) adjustedSleepTime += 24 * 60;
        if (wakeTime < 12 * 60) adjustedWakeTime += 24 * 60;

        let duration = (adjustedWakeTime - adjustedSleepTime) / 60;  // 计算时长（小时）
        if (duration < 0) duration += 24;  // 确保时长为正

        console.log('Duration calculation:', {
            sleep: sleepTimeStr,
            wake: wakeTimeStr,
            duration: duration
        });

        return duration;
    } catch (error) {
        console.error('Error calculating duration:', error);
        return 0;
    }
}