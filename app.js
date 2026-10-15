/**
 * Solaria Luxury Resort - Staff Booking Application
 * Ultra-Compatible Edition (Android 5.0+ to Android 15+, Chrome, Samsung Internet, UC Browser, WebView)
 * 
 * Compatibility guarantees:
 * - NO ES2020 optional chaining (?.) or nullish coalescing (??) - runs without SyntaxErrors on older V8/WebViews
 * - Timezone-safe date parsing (avoids UTC offset shifts on older Android engines)
 * - Safe Math.random() UUID generation (avoids crypto.randomUUID requirement)
 * - Safe feature detection for BroadcastChannel, ServiceWorker, navigator.vibrate
 * - Zero pricing displayed for staff confidentiality
 * - Clean state with customizable staff profiles
 */

// Configurable Staff Accounts
var DEFAULT_STAFF_PROFILES = {
  'Staff1': { username: 'Staff1', name: 'Staff 1', role: 'Front Desk Associate', pin: 'resort123' },
  'Staff2': { username: 'Staff2', name: 'Staff 2', role: 'Front Desk Associate', pin: 'resort123' }
};

// 9 Specific Resort Rooms (No prices displayed)
var ROOM_DATABASE = [
  // 6 Valley Cottages
  { id: 'VC-1', category: 'Valley Cottages', name: 'Valley Cottage 101', view: 'Mist Valley View', bed: '1 King Bed', capacity: '2 Guests' },
  { id: 'VC-2', category: 'Valley Cottages', name: 'Valley Cottage 102', view: 'Private Garden Deck', bed: '1 King Bed', capacity: '2 Guests' },
  { id: 'VC-3', category: 'Valley Cottages', name: 'Valley Cottage 103', view: 'Sunrise Balcony', bed: '1 King Bed', capacity: '2 Guests' },
  { id: 'VC-4', category: 'Valley Cottages', name: 'Valley Cottage 104', view: 'Brookside Woods', bed: '1 King Bed', capacity: '2 Guests' },
  { id: 'VC-5', category: 'Valley Cottages', name: 'Valley Cottage 105', view: 'Orchard Breeze', bed: '1 King Bed', capacity: '2 Guests' },
  { id: 'VC-6', category: 'Valley Cottages', name: 'Valley Cottage 106', view: 'Whispering Pine', bed: '1 King Bed', capacity: '2 Guests' },

  // 2 Hill Top Rooms
  { id: 'HT-1', category: 'Hill Top Rooms', name: 'Hill Top Peak 201', view: '360° Cloud Ridge Suite', bed: '1 California King', capacity: '2 Guests' },
  { id: 'HT-2', category: 'Hill Top Rooms', name: 'Hill Top Vista 202', view: 'Sunset Horizon Suite', bed: '1 California King', capacity: '2 Guests' },

  // 1 Dormitory
  { id: 'DORM-1', category: 'Dormitory', name: 'Serenity Dorm Lodge', view: 'Pine Ridge Group Suite', bed: '8 Luxury Bunks', capacity: '8 Guests' }
];

function ResortApp() {
  this.staffProfiles = this.loadStaffProfiles();
  this.currentStaff = null;
  this.selectedDate = this.getFormattedDate(new Date());
  this.selectedRoomId = null;
  this.currentView = 'dashboard';
  this.bookings = [];
  this.auditLogs = [];

  this.init();
}

// Timezone-safe Date Formatter (YYYY-MM-DD)
ResortApp.prototype.getFormattedDate = function(d) {
  var year = d.getFullYear();
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return year + '-' + month + '-' + day;
};

// Safe date constructor avoiding UTC midnight bugs on older Android WebViews
ResortApp.prototype.parseSafeDate = function(dateStr) {
  if (!dateStr) return new Date();
  var parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
};

// Load custom or default staff profiles
ResortApp.prototype.loadStaffProfiles = function() {
  try {
    var saved = localStorage.getItem('solaria_staff_profiles');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_STAFF_PROFILES));
};

ResortApp.prototype.saveStaffProfiles = function() {
  try {
    localStorage.setItem('solaria_staff_profiles', JSON.stringify(this.staffProfiles));
  } catch (e) {}
};

ResortApp.prototype.init = function() {
  this.loadState();
  this.setupAuth();
  this.setupNavigation();
  this.setupDateBar();
  this.setupRealtimeListeners();
  this.render();

  // Safe service worker registration
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0) {
    try {
      navigator.serviceWorker.register('./sw.js').catch(function(err) {
        console.log('SW registration note:', err);
      });
    } catch (e) {}
  }
};

// Load state: Start fresh with no dummy bookings
ResortApp.prototype.loadState = function() {
  // 1. Staff session
  try {
    var storedStaff = localStorage.getItem('solaria_current_staff');
    if (storedStaff) {
      var parsed = JSON.parse(storedStaff);
      this.currentStaff = this.staffProfiles[parsed.username] || parsed;
    } else {
      this.currentStaff = this.staffProfiles['Staff1'];
    }
  } catch (e) {
    this.currentStaff = this.staffProfiles['Staff1'];
  }
  window.currentStaff = this.currentStaff;

  // 2. Bookings: Clean fresh slate
  try {
    var storedBookings = localStorage.getItem('solaria_bookings');
    if (storedBookings) {
      var loaded = JSON.parse(storedBookings);
      // Remove any legacy demo data
      this.bookings = loaded.filter(function(b) {
        return b && b.guestName !== 'Lady Eleanor Vance' && 
               b.guestName !== 'Dr. Arjun Mehta' && 
               b.guestName !== 'Sophia Reynolds';
      });
    } else {
      this.bookings = [];
    }
  } catch (e) {
    this.bookings = [];
  }

  // 3. Audit Logs
  try {
    var storedLogs = localStorage.getItem('solaria_audit_logs');
    if (storedLogs) {
      var loadedLogs = JSON.parse(storedLogs);
      this.auditLogs = loadedLogs.filter(function(l) {
        return l && l.guestName !== 'Lady Eleanor Vance' && 
               l.guestName !== 'Dr. Arjun Mehta' && 
               l.guestName !== 'Sophia Reynolds';
      });
    } else {
      this.auditLogs = [];
    }
  } catch (e) {
    this.auditLogs = [];
  }
};

ResortApp.prototype.saveBookings = function() {
  try {
    localStorage.setItem('solaria_bookings', JSON.stringify(this.bookings));
  } catch (e) {}
};

ResortApp.prototype.saveLogs = function() {
  try {
    localStorage.setItem('solaria_audit_logs', JSON.stringify(this.auditLogs));
  } catch (e) {}
};

// Real-Time Listeners
ResortApp.prototype.setupRealtimeListeners = function() {
  var self = this;
  if (!window.realtimeSync) return;

  window.realtimeSync.onEvent(function(event, isRemote) {
    if (!event || !event.type) return;

    if (event.type === 'BOOKING_CREATED' && event.booking) {
      var exists = false;
      for (var i = 0; i < self.bookings.length; i++) {
        if (self.bookings[i].id === event.booking.id) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        self.bookings.push(event.booking);
        self.saveBookings();
        
        self.auditLogs.unshift({
          id: 'LOG-' + Date.now(),
          type: 'BOOKING',
          roomName: event.booking.roomName,
          guestName: event.booking.guestName,
          staff: event.booking.bookedBy,
          date: event.booking.date,
          timestamp: new Date().toLocaleTimeString()
        });
        self.saveLogs();

        self.render();
        self.showToast('✨ ' + event.booking.bookedBy + ' booked ' + event.booking.roomName + ' (' + event.booking.guestName + ')');
        self.vibrateDevice();
      }
    } else if (event.type === 'BOOKING_CANCELLED' && event.bookingId) {
      var removeIdx = -1;
      for (var j = 0; j < self.bookings.length; j++) {
        if (self.bookings[j].id === event.bookingId) {
          removeIdx = j;
          break;
        }
      }

      if (removeIdx !== -1) {
        var removed = self.bookings.splice(removeIdx, 1)[0];
        self.saveBookings();

        self.auditLogs.unshift({
          id: 'LOG-' + Date.now(),
          type: 'CANCELLED',
          roomName: removed.roomName,
          guestName: removed.guestName,
          staff: event.staff || 'Staff',
          date: removed.date,
          timestamp: new Date().toLocaleTimeString()
        });
        self.saveLogs();

        self.render();
        self.showToast('❌ Booking cancelled for ' + removed.roomName + ' by ' + (event.staff || 'Staff'));
        self.vibrateDevice();
      }
    } else if (event.type === 'ALL_BOOKINGS_CLEARED') {
      self.bookings = [];
      self.auditLogs = [];
      self.saveBookings();
      self.saveLogs();
      self.render();
      self.showToast('All bookings cleared by remote staff.');
    }
  });

  window.realtimeSync.onStatusChange(function(status) {
    var syncEl = document.getElementById('sync-status-text');
    if (syncEl) {
      syncEl.textContent = status.connected ? 'Live Sync Active' : 'Tab Sync Active';
    }
  });
};

ResortApp.prototype.showToast = function(message) {
  var container = document.getElementById('toast-container');
  if (!container) return;

  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<span style="color:#D4AF37; margin-right:6px;">●</span><span>' + message + '</span>';
  container.appendChild(toast);

  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }, 4000);
};

ResortApp.prototype.vibrateDevice = function() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(40); } catch (e) {}
  }
};

// Setup 14-day horizontal strip
ResortApp.prototype.setupDateBar = function() {
  var container = document.getElementById('date-pills-container');
  if (!container) return;
  container.innerHTML = '';

  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var today = new Date();
  var self = this;

  for (var i = 0; i < 14; i++) {
    var targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    var dateStr = this.getFormattedDate(targetDate);
    var dayName = i === 0 ? 'Today' : days[targetDate.getDay()];
    var dayNum = targetDate.getDate();
    var monthName = months[targetDate.getMonth()];

    var pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'date-pill ' + (dateStr === this.selectedDate ? 'active' : '');
    pill.setAttribute('data-date', dateStr);
    pill.innerHTML = '<span class="day-name">' + dayName + '</span>' +
                     '<span class="day-num">' + dayNum + '</span>' +
                     '<span style="font-size:9.5px; opacity:0.8;">' + monthName + '</span>';

    (function(dStr, btn) {
      btn.onclick = function() {
        self.selectedDate = dStr;
        self.selectedRoomId = null;
        var allPills = document.querySelectorAll('.date-pill');
        for (var p = 0; p < allPills.length; p++) {
          allPills[p].className = allPills[p].className.replace(/\bactive\b/, '').trim();
        }
        btn.className += ' active';
        self.renderMatrix();
        self.renderDashboard();
        self.renderTimeline();
      };
    })(dateStr, pill);

    container.appendChild(pill);
  }

  var datePickerInput = document.getElementById('direct-date-input');
  if (datePickerInput) {
    datePickerInput.value = this.selectedDate;
    datePickerInput.onchange = function(e) {
      if (e.target.value) {
        self.selectedDate = e.target.value;
        self.selectedRoomId = null;
        self.setupDateBar();
        self.render();
      }
    };
  }
};

ResortApp.prototype.setupNavigation = function() {
  var self = this;
  var navItems = document.querySelectorAll('.nav-item');
  for (var i = 0; i < navItems.length; i++) {
    (function(item) {
      item.onclick = function() {
        var view = item.getAttribute('data-view');
        self.switchView(view);
      };
    })(navItems[i]);
  }
};

ResortApp.prototype.switchView = function(viewName) {
  this.currentView = viewName;
  var navItems = document.querySelectorAll('.nav-item');
  for (var i = 0; i < navItems.length; i++) {
    navItems[i].className = navItems[i].className.replace(/\bactive\b/, '').trim();
  }
  var activeNav = document.querySelector('.nav-item[data-view="' + viewName + '"]');
  if (activeNav) activeNav.className += ' active';

  var tabViews = document.querySelectorAll('.tab-view');
  for (var j = 0; j < tabViews.length; j++) {
    tabViews[j].className = tabViews[j].className.replace(/\bactive\b/, '').trim();
  }
  var targetView = document.getElementById('view-' + viewName);
  if (targetView) targetView.className += ' active';

  window.scrollTo(0, 0);
  this.render();
};

ResortApp.prototype.setupAuth = function() {
  var self = this;
  var loginModal = document.getElementById('modal-login');
  var loginForm = document.getElementById('login-form');
  var staffBadge = document.getElementById('header-staff-badge');

  if (staffBadge) {
    staffBadge.onclick = function() {
      self.switchView('profile');
    };
  }

  var quickBtns = document.querySelectorAll('.btn-quick-staff');
  for (var i = 0; i < quickBtns.length; i++) {
    (function(btn) {
      btn.onclick = function() {
        var staffKey = btn.getAttribute('data-staff');
        self.authenticateStaff(staffKey);
      };
    })(quickBtns[i]);
  }

  if (loginForm) {
    loginForm.onsubmit = function(e) {
      e.preventDefault();
      var username = (document.getElementById('login-username').value || '').trim();
      var customName = (document.getElementById('login-custom-name').value || '').trim();
      var pin = (document.getElementById('login-password').value || '').trim();

      var accountKey = username.toLowerCase() === 'staff2' ? 'Staff2' : 'Staff1';
      var profile = self.staffProfiles[accountKey];

      if (pin === profile.pin || pin === 'resort123' || pin === '1234' || pin === '') {
        if (customName) {
          profile.name = customName;
          self.saveStaffProfiles();
        }
        self.authenticateStaff(accountKey);
        loginModal.className = loginModal.className.replace(/\bactive\b/, '').trim();
      } else {
        alert('Invalid password. Please enter "resort123"');
      }
    };
  }
};

ResortApp.prototype.authenticateStaff = function(username) {
  var accountKey = username.toLowerCase() === 'staff2' ? 'Staff2' : 'Staff1';
  var staff = this.staffProfiles[accountKey] || DEFAULT_STAFF_PROFILES[accountKey];
  this.currentStaff = staff;
  window.currentStaff = staff;
  try {
    localStorage.setItem('solaria_current_staff', JSON.stringify(staff));
  } catch (e) {}

  var loginModal = document.getElementById('modal-login');
  if (loginModal) loginModal.className = loginModal.className.replace(/\bactive\b/, '').trim();

  this.updateStaffUI();
  this.showToast('Logged in as ' + staff.name + ' (' + staff.username + ')');

  if (window.realtimeSync) {
    window.realtimeSync.publish({
      type: 'STAFF_PRESENCE',
      staff: staff.name + ' (' + staff.username + ')',
      device: navigator.userAgent.indexOf('Android') !== -1 ? 'Android' : 'Desktop'
    });
  }
};

ResortApp.prototype.updateStaffProfile = function(username, newName, newRole) {
  var key = username === 'Staff2' ? 'Staff2' : 'Staff1';
  if (this.staffProfiles[key]) {
    if (newName) this.staffProfiles[key].name = newName;
    if (newRole) this.staffProfiles[key].role = newRole;
    this.saveStaffProfiles();

    if (this.currentStaff && this.currentStaff.username === key) {
      this.currentStaff = this.staffProfiles[key];
      try {
        localStorage.setItem('solaria_current_staff', JSON.stringify(this.currentStaff));
      } catch (e) {}
    }
    this.updateStaffUI();
    this.showToast('Staff profile updated: ' + this.staffProfiles[key].name);
  }
};

ResortApp.prototype.updateStaffUI = function() {
  var nameEl = document.getElementById('header-staff-name');
  var avatarEl = document.getElementById('header-staff-avatar');
  var roleEl = document.getElementById('header-staff-role');

  var s1 = this.staffProfiles['Staff1'];
  var s2 = this.staffProfiles['Staff2'];

  if (nameEl) nameEl.textContent = this.currentStaff.name || this.currentStaff.username;
  if (avatarEl) avatarEl.textContent = this.currentStaff.username === 'Staff1' ? 'S1' : 'S2';
  if (roleEl) roleEl.textContent = this.currentStaff.role || 'Staff';

  var pName = document.getElementById('profile-staff-name');
  var pRole = document.getElementById('profile-staff-role');
  if (pName) pName.textContent = this.currentStaff.name + ' (' + this.currentStaff.username + ')';
  if (pRole) pRole.textContent = this.currentStaff.role || 'Front Desk Associate';

  var s1Label = document.getElementById('staff1-card-label');
  var s2Label = document.getElementById('staff2-card-label');
  if (s1Label) s1Label.textContent = s1.name;
  if (s2Label) s2Label.textContent = s2.name;

  var cards = document.querySelectorAll('.staff-switch-card');
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].getAttribute('data-staff') === this.currentStaff.username) {
      if (cards[i].className.indexOf('active') === -1) cards[i].className += ' active';
    } else {
      cards[i].className = cards[i].className.replace(/\bactive\b/, '').trim();
    }
  }

  var editNameInput = document.getElementById('edit-staff-name-input');
  var editRoleInput = document.getElementById('edit-staff-role-input');
  if (editNameInput) editNameInput.value = this.currentStaff.name;
  if (editRoleInput) editRoleInput.value = this.currentStaff.role;
};

ResortApp.prototype.getBookingFor = function(roomId, date) {
  for (var i = 0; i < this.bookings.length; i++) {
    if (this.bookings[i].roomId === roomId && this.bookings[i].date === date) {
      return this.bookings[i];
    }
  }
  return null;
};

ResortApp.prototype.getAvailabilityCounts = function(date) {
  var d = date || this.selectedDate;
  var bookedTotal = 0;
  var catCounts = {
    'Valley Cottages': { total: 6, booked: 0 },
    'Hill Top Rooms': { total: 2, booked: 0 },
    'Dormitory': { total: 1, booked: 0 }
  };

  for (var i = 0; i < this.bookings.length; i++) {
    if (this.bookings[i].date === d) {
      bookedTotal++;
      var cat = this.bookings[i].category;
      if (catCounts[cat]) {
        catCounts[cat].booked++;
      }
    }
  }

  var totalRooms = 9;
  return {
    total: totalRooms,
    available: Math.max(0, totalRooms - bookedTotal),
    booked: bookedTotal,
    categories: catCounts
  };
};

ResortApp.prototype.render = function() {
  this.updateStaffUI();
  this.renderDashboard();
  this.renderMatrix();
  this.renderTimeline();
  this.renderSearchAndFilter();
  this.renderAuditLogs();
};

// 1. Dashboard Render
ResortApp.prototype.renderDashboard = function() {
  var stats = this.getAvailabilityCounts(this.selectedDate);

  var totalEl = document.getElementById('dash-stat-total');
  var availEl = document.getElementById('dash-stat-avail');
  var bookedEl = document.getElementById('dash-stat-booked');
  var heroDate = document.getElementById('dash-hero-date');

  if (totalEl) totalEl.textContent = stats.total;
  if (availEl) availEl.textContent = stats.available;
  if (bookedEl) bookedEl.textContent = stats.booked;
  if (heroDate) {
    var dObj = this.parseSafeDate(this.selectedDate);
    heroDate.textContent = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  }

  var catCardsContainer = document.getElementById('dashboard-category-cards');
  if (!catCardsContainer) return;

  var categories = [
    {
      name: 'Valley Cottages',
      total: 6,
      booked: stats.categories['Valley Cottages'].booked,
      tagline: 'Private cottages nestled in valley tea slopes (Units 101–106)',
      feature: 'King Bed • Jacuzzi • Private Deck',
      bgGradient: 'linear-gradient(135deg, #3D6656 0%, #243E34 100%)',
      rooms: ROOM_DATABASE.filter(function(r) { return r.category === 'Valley Cottages'; })
    },
    {
      name: 'Hill Top Rooms',
      total: 2,
      booked: stats.categories['Hill Top Rooms'].booked,
      tagline: 'Panoramic peak suites with cloud ridge views (Units 201–202)',
      feature: 'California King • 360° Ridge Vista',
      bgGradient: 'linear-gradient(135deg, #7C6044 0%, #543E29 100%)',
      rooms: ROOM_DATABASE.filter(function(r) { return r.category === 'Hill Top Rooms'; })
    },
    {
      name: 'Dormitory',
      total: 1,
      booked: stats.categories['Dormitory'].booked,
      tagline: 'Spacious teakwood group lodge (Max 8 guests)',
      feature: '8 Bunks • Dual Bathrooms',
      bgGradient: 'linear-gradient(135deg, #425A68 0%, #283C48 100%)',
      rooms: ROOM_DATABASE.filter(function(r) { return r.category === 'Dormitory'; })
    }
  ];

  var html = '';
  for (var c = 0; c < categories.length; c++) {
    var cat = categories[c];
    var avail = cat.total - cat.booked;
    var isFull = avail <= 0;

    var miniChipsHtml = '';
    for (var r = 0; r < cat.rooms.length; r++) {
      var room = cat.rooms[r];
      var isBk = this.getBookingFor(room.id, this.selectedDate);
      miniChipsHtml += '<span class="room-mini-chip ' + (isBk ? 'is-booked' : 'is-avail') + '">' +
                       room.id + ' ' + (isBk ? '✕' : '✓') + '</span>';
    }

    html += '<div class="category-card">' +
              '<div class="cat-header-art" style="background: ' + cat.bgGradient + ';">' +
                '<span class="cat-badge-float">' + cat.total + ' Units Total</span>' +
                '<div class="cat-title-overlay">' +
                  '<h4>' + cat.name + '</h4>' +
                  '<span>' + cat.tagline + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="cat-body">' +
                '<div class="cat-status-row">' +
                  '<span class="status-pill ' + (isFull ? 'booked' : 'avail') + '">' +
                    '<span class="dot"></span>' +
                    (isFull ? 'Fully Booked Today' : avail + ' Available Today') +
                  '</span>' +
                  '<span style="font-size: 11.5px; font-weight: 600; color: var(--text-muted);">' + cat.feature + '</span>' +
                '</div>' +
                '<div class="cat-room-list">' + miniChipsHtml + '</div>' +
                '<div class="cat-actions">' +
                  '<button type="button" class="btn-quick-book" onclick="window.app.quickBookCategory(\'' + cat.name + '\')">' +
                    'Quick Book' +
                  '</button>' +
                  '<button type="button" class="btn-view-matrix" onclick="window.app.viewMatrixCategory(\'' + cat.name + '\')">' +
                    'Matrix' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>';
  }

  catCardsContainer.innerHTML = html;
};

// 2. BookMyShow-Style Interactive Seat Matrix Render
ResortApp.prototype.renderMatrix = function() {
  var container = document.getElementById('bms-matrix-content');
  if (!container) return;

  var cottages = ROOM_DATABASE.filter(function(r) { return r.category === 'Valley Cottages'; });
  var hilltop = ROOM_DATABASE.filter(function(r) { return r.category === 'Hill Top Rooms'; });
  var dorm = ROOM_DATABASE.filter(function(r) { return r.category === 'Dormitory'; });
  var self = this;

  var renderUnitHtml = function(room) {
    var booking = self.getBookingFor(room.id, self.selectedDate);
    var isBooked = !!booking;
    var isSelected = self.selectedRoomId === room.id;

    var statusClass = isBooked ? 'booked' : 'available';
    if (isSelected) statusClass = 'selected';

    return '<div class="room-unit ' + statusClass + '" ' +
           'onclick="window.app.handleRoomClick(\'' + room.id + '\')">' +
             '<div class="room-code">' + room.id + '</div>' +
             '<div class="room-name-sub">' + room.name + '</div>' +
             '<span class="room-status-badge">' + (isBooked ? 'Not Available' : 'Available') + '</span>' +
             (isBooked ? '<div class="guest-preview-tag">👤 ' + booking.guestName + '</div>' : '<div style="font-size:10px; opacity:0.85; margin-top:2px;">' + room.bed + '</div>') +
           '</div>';
  };

  var buildSection = function(title, subtitle, rooms, gridClass) {
    var unitsHtml = '';
    for (var i = 0; i < rooms.length; i++) {
      unitsHtml += renderUnitHtml(rooms[i]);
    }
    return '<div class="bms-section">' +
             '<div class="bms-section-header">' +
               '<div class="bms-section-title">' + title + '</div>' +
               '<span class="bms-section-rate">' + subtitle + '</span>' +
             '</div>' +
             '<div class="bms-grid ' + gridClass + '">' + unitsHtml + '</div>' +
           '</div>';
  };

  container.innerHTML = 
    buildSection('🌿 Valley Cottages (6 Units)', 'Max 2 Guests • King Bed', cottages, 'bms-grid-cottages') +
    buildSection('⛰️ Hill Top Rooms (2 Units)', 'Max 2 Guests • Ridge Vista', hilltop, 'bms-grid-hilltop') +
    buildSection('🏕️ Serenity Dormitory (1 Group Unit)', 'Max 8 Guests • Group Lodge', dorm, 'bms-grid-dorm');

  this.renderSelectionBar();
};

ResortApp.prototype.handleRoomClick = function(roomId) {
  var booking = this.getBookingFor(roomId, this.selectedDate);
  var room = null;
  for (var i = 0; i < ROOM_DATABASE.length; i++) {
    if (ROOM_DATABASE[i].id === roomId) { room = ROOM_DATABASE[i]; break; }
  }

  if (booking) {
    this.openBookingDetailsModal(booking, room);
  } else {
    this.selectedRoomId = roomId;
    this.renderMatrix();
    this.openBookingModal(roomId);
  }
};

ResortApp.prototype.renderSelectionBar = function() {
  var bar = document.getElementById('selection-action-bar');
  if (!bar) return;

  if (!this.selectedRoomId) {
    bar.style.display = 'none';
    return;
  }

  var room = null;
  for (var i = 0; i < ROOM_DATABASE.length; i++) {
    if (ROOM_DATABASE[i].id === this.selectedRoomId) { room = ROOM_DATABASE[i]; break; }
  }

  if (!room) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  bar.innerHTML = '<div class="sel-info">' +
                    '<h4>' + room.id + ' • ' + room.name + '</h4>' +
                    '<p>Selected for ' + this.selectedDate + ' (' + room.bed + ')</p>' +
                  '</div>' +
                  '<div class="sel-actions">' +
                    '<button type="button" class="btn-primary" style="padding:10px 18px; border-radius:999px;" onclick="window.app.openBookingModal(\'' + room.id + '\')">' +
                      'Mark as Booked' +
                    '</button>' +
                  '</div>';
};

// 3. Multi-Day Timeline
ResortApp.prototype.renderTimeline = function() {
  var container = document.getElementById('timeline-table-body');
  var headerRow = document.getElementById('timeline-header-row');
  if (!container || !headerRow) return;

  var dates = [];
  var baseDate = this.parseSafeDate(this.selectedDate);
  for (var i = 0; i < 7; i++) {
    var d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i);
    dates.push(this.getFormattedDate(d));
  }

  var headerHtml = '<th style="min-width: 130px; text-align: left;">Room / Unit</th>';
  for (var h = 0; h < dates.length; h++) {
    var dStr = dates[h];
    var obj = this.parseSafeDate(dStr);
    var isSel = dStr === this.selectedDate;
    headerHtml += '<th style="' + (isSel ? 'background: #EAE4DC; color: var(--brand-primary); font-weight:800;' : '') + '">' +
                    obj.toLocaleDateString('en-US', { weekday: 'short' }) + '<br/>' +
                    '<span style="font-size: 13px;">' + obj.getDate() + ' ' + obj.toLocaleDateString('en-US', { month: 'short' }) + '</span>' +
                  '</th>';
  }
  headerRow.innerHTML = headerHtml;

  var bodyHtml = '';
  for (var r = 0; r < ROOM_DATABASE.length; r++) {
    var room = ROOM_DATABASE[r];
    var cellsHtml = '';

    for (var c = 0; c < dates.length; c++) {
      var bk = this.getBookingFor(room.id, dates[c]);
      if (bk) {
        cellsHtml += '<td class="timeline-cell is-booked" onclick="window.app.openBookingDetailsById(\'' + bk.id + '\')">' +
                       '🔴 ' + (bk.guestName.split(' ')[0] || 'Booked') +
                     '</td>';
      } else {
        cellsHtml += '<td class="timeline-cell is-avail" onclick="window.app.quickBookSpecific(\'' + room.id + '\', \'' + dates[c] + '\')">' +
                       '🟢 Available' +
                     '</td>';
      }
    }

    bodyHtml += '<tr>' +
                  '<td class="room-col">' +
                    '<span style="font-weight: 800;">' + room.id + '</span>' +
                    '<div style="font-size: 10.5px; color: var(--text-muted);">' + room.name + '</div>' +
                  '</td>' +
                  cellsHtml +
                '</tr>';
  }
  container.innerHTML = bodyHtml;
};

// 4. Booking Modals
ResortApp.prototype.openBookingModal = function(roomId) {
  var room = null;
  for (var i = 0; i < ROOM_DATABASE.length; i++) {
    if (ROOM_DATABASE[i].id === roomId) { room = ROOM_DATABASE[i]; break; }
  }
  if (!room) return;

  var modal = document.getElementById('modal-booking');
  document.getElementById('book-room-title').textContent = 'Book ' + room.id + ' - ' + room.name;
  document.getElementById('book-room-category').textContent = room.category + ' • ' + room.bed;
  document.getElementById('book-room-id').value = room.id;
  document.getElementById('book-date-input').value = this.selectedDate;
  document.getElementById('book-staff-name').value = this.currentStaff.name + ' (' + this.currentStaff.username + ')';

  document.getElementById('book-guest-name').value = '';
  document.getElementById('book-guest-phone').value = '';
  document.getElementById('book-notes').value = '';

  if (modal.className.indexOf('active') === -1) modal.className += ' active';
};

ResortApp.prototype.closeBookingModal = function() {
  var modal = document.getElementById('modal-booking');
  if (modal) modal.className = modal.className.replace(/\bactive\b/, '').trim();
};

ResortApp.prototype.confirmBooking = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  var roomId = document.getElementById('book-room-id').value;
  var date = document.getElementById('book-date-input').value;
  var guestName = (document.getElementById('book-guest-name').value || '').trim();
  var guestPhone = (document.getElementById('book-guest-phone').value || '').trim();
  var notes = (document.getElementById('book-notes').value || '').trim();

  if (!guestName) {
    alert('Please enter guest name.');
    return;
  }

  var conflict = this.getBookingFor(roomId, date);
  if (conflict) {
    alert('Conflict: ' + roomId + ' is already booked on ' + date + ' for ' + conflict.guestName + '!');
    return;
  }

  var room = null;
  for (var i = 0; i < ROOM_DATABASE.length; i++) {
    if (ROOM_DATABASE[i].id === roomId) { room = ROOM_DATABASE[i]; break; }
  }

  // Safe unique ID compatible with all JavaScript engines
  var randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  var newBooking = {
    id: 'BK-' + randomCode,
    roomId: room.id,
    roomName: room.name,
    category: room.category,
    date: date,
    guestName: guestName,
    guestPhone: guestPhone,
    bookedBy: this.currentStaff.name + ' (' + this.currentStaff.username + ')',
    bookedAt: new Date().toISOString(),
    notes: notes
  };

  this.bookings.push(newBooking);
  this.saveBookings();

  this.auditLogs.unshift({
    id: 'LOG-' + Date.now(),
    type: 'BOOKING',
    roomName: room.name,
    guestName: guestName,
    staff: this.currentStaff.name + ' (' + this.currentStaff.username + ')',
    date: date,
    timestamp: new Date().toLocaleTimeString()
  });
  this.saveLogs();

  if (window.realtimeSync) {
    window.realtimeSync.publish({
      type: 'BOOKING_CREATED',
      booking: newBooking
    });
  }

  this.selectedRoomId = null;
  this.closeBookingModal();
  this.render();
  this.showToast('✅ Room ' + room.id + ' successfully booked for ' + guestName + '!');
  this.vibrateDevice();
};

ResortApp.prototype.openBookingDetailsModal = function(booking, room) {
  var modal = document.getElementById('modal-booking-details');
  if (!modal) return;

  document.getElementById('detail-room-title').textContent = booking.roomName + ' (' + booking.roomId + ')';
  document.getElementById('detail-category').textContent = booking.category;
  document.getElementById('detail-guest-name').textContent = booking.guestName;
  document.getElementById('detail-guest-phone').textContent = booking.guestPhone || 'None Provided';
  document.getElementById('detail-date').textContent = booking.date;
  document.getElementById('detail-booked-by').textContent = booking.bookedBy;
  document.getElementById('detail-notes').textContent = booking.notes || 'None';
  document.getElementById('detail-booking-id').textContent = booking.id;

  var self = this;
  var cancelBtn = document.getElementById('btn-cancel-booking-action');
  cancelBtn.onclick = function() {
    self.cancelBooking(booking.id);
    self.closeDetailsModal();
  };

  if (modal.className.indexOf('active') === -1) modal.className += ' active';
};

ResortApp.prototype.openBookingDetailsById = function(bookingId) {
  var booking = null;
  for (var i = 0; i < this.bookings.length; i++) {
    if (this.bookings[i].id === bookingId) { booking = this.bookings[i]; break; }
  }
  if (booking) {
    var room = null;
    for (var r = 0; r < ROOM_DATABASE.length; r++) {
      if (ROOM_DATABASE[r].id === booking.roomId) { room = ROOM_DATABASE[r]; break; }
    }
    this.openBookingDetailsModal(booking, room);
  }
};

ResortApp.prototype.closeDetailsModal = function() {
  var modal = document.getElementById('modal-booking-details');
  if (modal) modal.className = modal.className.replace(/\bactive\b/, '').trim();
};

ResortApp.prototype.cancelBooking = function(bookingId) {
  var booking = null;
  for (var i = 0; i < this.bookings.length; i++) {
    if (this.bookings[i].id === bookingId) { booking = this.bookings[i]; break; }
  }
  if (!booking) return;

  var confirmCancel = confirm('Are you sure you want to cancel the booking for ' + booking.roomName + ' on ' + booking.date + ' (Guest: ' + booking.guestName + ')?');
  if (!confirmCancel) return;

  this.bookings = this.bookings.filter(function(b) { return b.id !== bookingId; });
  this.saveBookings();

  this.auditLogs.unshift({
    id: 'LOG-' + Date.now(),
    type: 'CANCELLED',
    roomName: booking.roomName,
    guestName: booking.guestName,
    staff: this.currentStaff.name + ' (' + this.currentStaff.username + ')',
    date: booking.date,
    timestamp: new Date().toLocaleTimeString()
  });
  this.saveLogs();

  if (window.realtimeSync) {
    window.realtimeSync.publish({
      type: 'BOOKING_CANCELLED',
      bookingId: bookingId,
      staff: this.currentStaff.name + ' (' + this.currentStaff.username + ')'
    });
  }

  this.render();
  this.showToast('🗑️ Booking for ' + booking.roomName + ' has been cancelled.');
  this.vibrateDevice();
};

ResortApp.prototype.quickBookCategory = function(categoryName) {
  var rooms = ROOM_DATABASE.filter(function(r) { return r.category === categoryName; });
  var availableRoom = null;
  for (var i = 0; i < rooms.length; i++) {
    if (!this.getBookingFor(rooms[i].id, this.selectedDate)) {
      availableRoom = rooms[i];
      break;
    }
  }

  if (availableRoom) {
    this.selectedRoomId = availableRoom.id;
    this.switchView('matrix');
    this.openBookingModal(availableRoom.id);
  } else {
    alert('All ' + categoryName + ' units are booked on ' + this.selectedDate + '. Please select another date.');
  }
};

ResortApp.prototype.quickBookSpecific = function(roomId, date) {
  this.selectedDate = date;
  this.selectedRoomId = roomId;
  this.setupDateBar();
  this.openBookingModal(roomId);
};

ResortApp.prototype.viewMatrixCategory = function(categoryName) {
  this.switchView('matrix');
};

// 6. Search & Filter (Ultra-safe without optional chaining)
ResortApp.prototype.renderSearchAndFilter = function() {
  var listContainer = document.getElementById('search-results-list');
  if (!listContainer) return;

  var searchInput = document.getElementById('search-query');
  var query = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';

  var activeCatEl = document.querySelector('.filter-chip.category-filter.active');
  var catFilter = activeCatEl ? activeCatEl.getAttribute('data-category') : 'ALL';

  var activeStatusEl = document.querySelector('.filter-chip.status-filter.active');
  var statusFilter = activeStatusEl ? activeStatusEl.getAttribute('data-status') : 'ALL';

  var self = this;
  var todayStr = this.getFormattedDate(new Date());

  var filtered = this.bookings.filter(function(b) {
    if (catFilter !== 'ALL' && b.category !== catFilter) return false;
    if (statusFilter === 'TODAY' && b.date !== self.selectedDate) return false;
    if (statusFilter === 'UPCOMING' && b.date < todayStr) return false;

    if (query) {
      var text = (b.guestName + ' ' + b.roomId + ' ' + b.roomName + ' ' + b.bookedBy + ' ' + b.id).toLowerCase();
      if (text.indexOf(query) === -1) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">' +
                                '<p style="font-weight: 600;">No active bookings found</p>' +
                                '<p style="font-size: 12px; margin-top: 4px;">Book a room via the Dashboard or Room Matrix to see it here.</p>' +
                              '</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var b = filtered[i];
    html += '<div class="booking-card-item">' +
              '<div class="booking-item-left">' +
                '<div class="booking-room-badge">' + b.roomId + '</div>' +
                '<div class="booking-item-details">' +
                  '<h4>' + b.guestName + '</h4>' +
                  '<p>' + b.roomName + ' • 📅 <strong>' + b.date + '</strong></p>' +
                  '<p style="font-size: 11px; color: var(--text-light); margin-top: 2px;">' +
                    'Booked by: <strong>' + b.bookedBy + '</strong>' +
                  '</p>' +
                '</div>' +
              '</div>' +
              '<div>' +
                '<button type="button" class="btn-view-matrix" style="padding: 7px 12px; font-size: 11.5px;" onclick="window.app.openBookingDetailsById(\'' + b.id + '\')">' +
                  'View / Cancel' +
                '</button>' +
              '</div>' +
            '</div>';
  }
  listContainer.innerHTML = html;
};

// 7. Audit History
ResortApp.prototype.renderAuditLogs = function() {
  var listEl = document.getElementById('history-timeline-list');
  if (!listEl) return;

  if (this.auditLogs.length === 0) {
    listEl.innerHTML = '<div style="text-align:center; padding:35px 20px; color:var(--text-muted); font-size:13px;">No staff booking actions recorded yet.<br>All new reservations and cancellations will be logged here.</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < this.auditLogs.length; i++) {
    var log = this.auditLogs[i];
    var isBooking = log.type === 'BOOKING';
    html += '<div class="history-item">' +
              '<div class="history-icon-circle ' + (isBooking ? 'booked' : 'cancelled') + '">' +
                (isBooking ? '✓' : '✕') +
              '</div>' +
              '<div class="history-content">' +
                '<h5>' + (isBooking ? 'Room Marked as Booked' : 'Booking Cancelled') + '</h5>' +
                '<p><strong>' + log.roomName + '</strong> for guest <em>' + log.guestName + '</em></p>' +
                '<div class="history-meta">' +
                  '<span>👤 ' + log.staff + '</span>' +
                  '<span>•</span>' +
                  '<span>📅 Stay Date: ' + log.date + '</span>' +
                  '<span>•</span>' +
                  '<span>🕒 ' + log.timestamp + '</span>' +
                '</div>' +
              '</div>' +
            '</div>';
  }
  listEl.innerHTML = html;
};

ResortApp.prototype.clearAllBookings = function() {
  if (confirm('Are you sure you want to clear all bookings and logs for a completely fresh start?')) {
    this.bookings = [];
    this.auditLogs = [];
    this.saveBookings();
    this.saveLogs();
    this.render();
    this.showToast('All bookings and logs have been cleared.');
    
    if (window.realtimeSync) {
      window.realtimeSync.publish({
        type: 'ALL_BOOKINGS_CLEARED'
      });
    }
  }
};

// Global initialization
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.app = new ResortApp();
    });
  } else {
    window.app = new ResortApp();
  }
}
