# Focus Timer

A comprehensive web-based focus timer with activity tracking, mood monitoring, and data visualization. Track your focus time, daily activities, sleep schedule, and mood changes.

## Features

### Focus Timer
- ⏱️ Precise timing with pause/resume
- 🎨 Color-coded control buttons
  - Green: Start
  - Orange: Pause
  - Blue: Resume
  - Red: Stop
- 📝 Optional task description
- ✨ Auto-detect effective focus (≥25min)
- 📊 Daily and monthly statistics

### Activity Tracking
- 🌅 Wake up time tracking (can update anytime)
- 🌙 Sleep time tracking (can update anytime)
- 💪 Exercise tracking with counter
- 📚 Study tracking with counter
- 🔄 Auto-save feature
- 🔁 Auto-resume after page refresh

### Mood Monitoring
- 😊 Four mood states (Great, Good, Meh, Bad)
- 📈 Daily mood tracking
- 📊 Monthly mood statistics

### Statistics & Visualization
- 📊 Monthly focus time chart
- 😴 Sleep duration analysis
  - Daily sleep/wake time record
  - Sleep duration calculation
- 📈 Progress tracking
- 🎯 Daily/Weekly/Monthly summary
  - Week starts from Monday
- 📅 Weekend highlighting in charts
- 🎨 Color-coded focus sessions

### Data Management
- 💾 Auto-save to localStorage
- 🔄 Daily auto-reset at midnight
- 📤 Data export
  - JSON backup
  - CSV for analysis
- 📥 Data import
- 🔁 Session state preservation

## Usage

### Focus Timer
1. Enter task description (optional)
2. Click green "Start" button to begin
3. Use orange "Pause" button to pause (turns blue for "Resume")
4. Click red "Stop" button to end session
5. Can modify task name before stopping

### Activity Tracking
- Click sun icon to update wake-up time (overwrites previous record)
- Click moon icon to update sleep time (overwrites previous record)
- Click dumbbell to start exercise timer and count
- Click book to start study timer and count

### Mood Recording
- Click mood icons to record current mood
- Multiple recordings per day allowed
- Counts displayed on icons

### Summary View
- Today's focus time and sessions
- This week's statistics
- This month's overview
- Color-coded for easy reading

## Technical Details

### Built With
- HTML5
- CSS3
- JavaScript
- Chart.js for visualizations
- Material Icons for UI

### Data Storage
- Uses browser's localStorage
- Session state preservation
- Daily data auto-resets at midnight
- Monthly statistics preserved
- Backup/restore functionality

### Mobile Support
- Responsive design
- Touch-friendly interface
- Mobile-optimized charts
- Touch feedback effects

## Installation

1. Clone repository
2. Open index.html in browser
3. Start tracking!

## Browser Support
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

## Data Privacy
- All data stored locally
- No server communication
- Regular backups recommended

## License
MIT License 