// ========================
// ① CONFIG
// ========================
const SUPABASE_URL      = 'https://qpmigmvpbiojrevuftxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbWlnbXZwYmlvanJldnVmdHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDY1NDEsImV4cCI6MjA4NzY4MjU0MX0.2waRZj9kDSumx7w7PGijHVl1gz5O__WzP-xaD8F0YdA';
const ONESIGNAL_APP_ID  = 'faeb96bd-c8df-47b3-9dcc-c3287d553c8d';
const APP_EMAIL_DOMAIN  = 'skillnote.app';

// ========================
// ② SUPABASE 초기화
// ========================
const { createClient } = window.supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================
// ③ 전역 상태
// ========================
let schedules        = [];
let freelancerProfiles = [];
let allProfiles      = [];
let pendingProfiles  = [];
let currentUser      = null;
let currentDate      = new Date();
let currentView      = 'admin';
let currentFilter    = 'all';
let selectedFreelancer = '';
let selectedLocation   = '';
let searchQuery      = '';
let dateRangeFilter  = { type: 'all', startDate: null, endDate: null };
let bulkDate         = new Date();
let selectedDates    = [];
let dateTimePairs    = {};
let ongoingMeetings  = {};
let meetingTitlesHistory = [];
