// app.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');

            // Hide all views
            views.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
            });

            // Show target view
            const targetId = item.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.remove('hidden');
                // Trigger reflow for animation
                void targetView.offsetWidth;
                targetView.classList.add('active');
            }
        });
    });

    // --- Data Fetching Logic ---
    const API_BASE = '/api';

    // Helper functions for UI rendering
    function getStatusClass(percent) {
        if (percent < 40) return 'status-low';
        if (percent < 75) return 'status-med';
        return 'status-high';
    }

    function getStatusText(percent) {
        if (percent < 40) return 'Moving Fast';
        if (percent < 75) return 'Moderate';
        return 'Congested';
    }

    function getWaitClass(mins) {
        if (mins < 10) return 'status-low';
        if (mins < 20) return 'status-med';
        return 'status-high';
    }
    
    function getFacilityStatusClass(status) {
        if (status === 'Operational') return 'status-low';
        if (status === 'Temporarily Closed') return 'status-high';
        return 'status-med'; // Crowded
    }

    function createListCard(title, subtitle, badgeText, badgeClass, icon = null) {
        const iconHtml = icon ? `<i class="${icon}" style="margin-right: 8px;"></i>` : '';
        return `
            <div class="card list-card">
                <div class="list-item-info">
                    <div class="list-item-title">${iconHtml}${title}</div>
                    <div class="list-item-sub">${subtitle}</div>
                </div>
                <div class="status-badge ${badgeClass}">${badgeText}</div>
            </div>
        `;
    }

    // API Pollers
    async function fetchCrowdLevels() {
        try {
            const res = await fetch(`${API_BASE}/crowd`);
            const data = await res.json();
            
            // Render Gates
            const gatesContainer = document.getElementById('gates-container');
            const sectionsContainer = document.getElementById('sections-container');
            
            let gatesHtml = '<h3>Gates</h3>';
            data.gates.forEach(gate => {
                gatesHtml += createListCard(
                    gate.name, 
                    `${gate.occupancy_percent}% Flow Capacity`,
                    getStatusText(gate.occupancy_percent),
                    getStatusClass(gate.occupancy_percent)
                );
            });
            gatesContainer.innerHTML = gatesHtml;

            // Render Sections
            let sectionsHtml = '<h3>Sections</h3>';
            data.sections.forEach(sec => {
                sectionsHtml += createListCard(
                    sec.name,
                    `${sec.occupancy_percent}% Occupied`,
                    getStatusText(sec.occupancy_percent),
                    getStatusClass(sec.occupancy_percent)
                );
            });
            sectionsContainer.innerHTML = sectionsHtml;

        } catch (error) {
            console.error('Error fetching crowd data:', error);
        }
    }

    async function fetchWaitTimes() {
        try {
            const res = await fetch(`${API_BASE}/waittimes`);
            const data = await res.json();
            
            // Average calculation for top cards
            const avgFood = Math.round(data.food_stalls.reduce((acc, curr) => acc + curr.wait_time_mins, 0) / data.food_stalls.length);
            const avgParking = Math.round(data.parking.reduce((acc, curr) => acc + curr.wait_time_mins, 0) / data.parking.length);
            
            document.getElementById('avg-food-wait').innerText = avgFood;
            document.getElementById('avg-park-wait').innerText = avgParking;

            // Render specific breaks
            const specificContainer = document.getElementById('specific-wait-container');
            let html = '<h3>Detailed Breakdown</h3>';
            
            data.food_stalls.slice(0,3).forEach(stall => {
                html += createListCard(stall.name, 'Food & Beverage', `${stall.wait_time_mins} m`, getWaitClass(stall.wait_time_mins), 'fa-solid fa-utensils');
            });
            
            data.gates.slice(0,2).forEach(gate => {
                html += createListCard(gate.name, 'Entry Queue', `${gate.wait_time_mins} m`, getWaitClass(gate.wait_time_mins), 'fa-solid fa-door-open');
            });

            specificContainer.innerHTML = html;

        } catch (error) {
            console.error('Error fetching wait times:', error);
        }
    }

    async function fetchNavigation() {
        try {
            const res = await fetch(`${API_BASE}/navigation`);
            const data = await res.json();
            
            const container = document.getElementById('routes-container');
            let html = '';
            
            data.routes.forEach(route => {
                let stepsHtml = route.steps.map(step => `<li>${step}</li>`).join('');
                
                html += `
                <div class="card nav-card">
                    <div class="route-endpoints">
                        <div class="route-dot"></div>
                        <div class="route-desc">
                            <div class="list-item-sub">Wait optimized route</div>
                            <div class="list-item-title">${route.origin} to ${route.destination}</div>
                        </div>
                        <div class="route-eta">${route.estimated_time_mins}m</div>
                    </div>
                    <div class="route-steps">
                        <ul>${stepsHtml}</ul>
                    </div>
                </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error fetching navigation', error);
        }
    }

    async function fetchUpdates() {
        try {
            // Live Updates Fetch
            const resUpdates = await fetch(`${API_BASE}/updates`);
            const dataUpdates = await resUpdates.json();
            
            const updatesContainer = document.getElementById('live-updates-container');
            let updatesHtml = '';
            dataUpdates.updates.forEach(upd => {
                updatesHtml += `
                <div class="update-item">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <div class="update-text">${upd}</div>
                </div>
                `;
            });
            if(updatesHtml === '') {
                updatesHtml = '<div class="update-item"><div class="update-text">No active alerts.</div></div>';
            }
            updatesContainer.innerHTML = updatesHtml;

            // Facilities Fetch
            const resFac = await fetch(`${API_BASE}/facilities`);
            const dataFac = await resFac.json();
            
            const facContainer = document.getElementById('facilities-container');
            let facHtml = '<h3>Facilities Status</h3>';
            dataFac.facilities.forEach(fac => {
                let iconClass = 'fa-solid fa-circle-info';
                if(fac.type === 'medical') iconClass = 'fa-solid fa-staff-snake';
                if(fac.type === 'restroom') iconClass = 'fa-solid fa-restroom';
                if(fac.type === 'retail') iconClass = 'fa-solid fa-shop';

                facHtml += createListCard(
                    fac.name, 
                    fac.type.toUpperCase(), 
                    fac.status, 
                    getFacilityStatusClass(fac.status),
                    iconClass
                );
            });
            facContainer.innerHTML = facHtml;

        } catch (error) {
            console.error('Error fetching updates/facilities', error);
        }
    }

    // Polling orchestrator
    function pollData() {
        fetchCrowdLevels();
        fetchWaitTimes();
        fetchNavigation();
        fetchUpdates();
    }

    // Initial fetch
    pollData();

    // Set intervals for polling (every 5 seconds)
    setInterval(pollData, 5000);
});
