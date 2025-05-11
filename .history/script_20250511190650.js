document.addEventListener('DOMContentLoaded', function () {
     

    // initialize
    resetSponsoredJobs();
    const sector = document.body.getAttribute('data-sector');
    if (sector && sector.trim()) {
        fetchSponsoredJobsBySector(sector);
    } else {
        fetchJobListings();
    }

    // wire up the Search button
    document.getElementById('search-button').addEventListener('click', handleSearch);
});



let currentPage = 0; // Current page of jobs
const jobsPerPage = 10; // Number of jobs per page
let preRandomizedJobs = []; // Jobs randomized and ready for pagination
let usedSponsoredJobs = []; // Track used sponsored jobs

// load the same header into every page
fetch('header.html')
  .then(r => r.text())
  .then(html => {
    const el = document.getElementById('global-header');
    if (el) el.innerHTML = html;
  });

 
  

// load the same footer into every page
fetch('footer.html')
  .then(r => r.text())
  .then(html => {
    const el = document.getElementById('global-footer');
    if (el) el.innerHTML = html;
  });


function resetSponsoredJobs() {
    usedSponsoredJobs = [];
}

// Helper function to fetch and parse CSV files
async function fetchCsv(filePath) {
    const response = await fetch(filePath);
    const text = await response.text();
    return Papa.parse(text, { header: true }).data;
}

// Normalize Sponsored field
function normalizeSponsoredField(jobs) {
    return jobs.map((job) => ({
        ...job,
        Sponsored: job['Sponsored'] ? job['Sponsored'].toString().toLowerCase() === 'true' : false,
    }));
}

// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Arrange Sponsored Jobs
function arrangeSponsoredJobs(jobs, pageIndex, pageSize) {
    const sponsoredJobs = jobs.filter(
        (job) => job['Sponsored'] === true && !usedSponsoredJobs.includes(job['Job URL'])
    );
    const regularJobs = jobs.filter((job) => job['Sponsored'] !== true);

    const arrangedJobs = [];
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;

    for (let i = startIndex; i < endIndex; i++) {
        const position = i % pageSize;
        if ((position === 0 || position === 4) && sponsoredJobs.length > 0) {
            const sponsoredJob = sponsoredJobs.shift();
            arrangedJobs.push(sponsoredJob);
            usedSponsoredJobs.push(sponsoredJob['Job URL']); // Mark as used
        } else if (regularJobs.length > 0) {
            arrangedJobs.push(regularJobs.shift());
        }
    }

    return arrangedJobs;
}

// **NEW**: handle the search
async function handleSearch() {
    // reset pagination & sponsorship
    currentPage = 0;
    resetSponsoredJobs();

    // clear current listings
    const container = document.getElementById('job-listings');
    container.innerHTML = '';

    // get queries
    const titleQ = document.getElementById('job-title').value.toLowerCase().trim();
    const locQ   = document.getElementById('location').value.toLowerCase().trim();

    // re-fetch raw CSV data
    const jobs        = await fetchCsv('scrape/job_listings.csv');
    const sponsorship = await fetchCsv('scrape/sponsored_jobs.csv');
    const sponsorMap  = sponsorship.reduce((m, job) => (m[job.ID] = job, m), {});

    // enrich & filter
    const enriched = jobs.map(job => ({
        ...job,
        Sponsored: !!sponsorMap[job.ID],
        Category:  sponsorMap[job.ID]?.Category || ''
    }));
    const filtered = enriched.filter(job => {
        const titleMatch = titleQ   ? (job['Job Title']||'').toLowerCase().includes(titleQ)   : true;
        const locMatch   = locQ     ? (job['Location']||'').toLowerCase().includes(locQ)     : true;
        return titleMatch && locMatch;
    });

    // shuffle, recount, display
    preRandomizedJobs = shuffleArray(filtered);
    updateJobCount(preRandomizedJobs.length);
    displayJobListings(preRandomizedJobs);
}

// Display Job Listings
function displayJobListings(jobs) {
    const jobListingsContainer = document.getElementById('job-listings');
    if (!jobListingsContainer) {
        console.error('Job listings container not found!');
        return;
    }

    const currentJobs = jobs.slice(currentPage * jobsPerPage, (currentPage + 1) * jobsPerPage);
    const arrangedJobs = arrangeSponsoredJobs(jobs, currentPage, jobsPerPage);

    arrangedJobs.forEach((job) => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-cards';

        const isSponsored = job['Sponsored'] === true;
        const jobURL = job['Job URL'];

        if (isSponsored) {
            jobCard.classList.add('sponsored');
            const category = job['Category'] || 'Sponsored';
            jobCard.classList.add(category.toLowerCase().replace(/\s+/g, '-')); // Add category-based class
            jobCard.innerHTML += `<div class="badge">${category}</div>`; // Add category badge
        }

            // build the inner HTML without inline onclick
      card.innerHTML = `
      <div class="badge">${s.Category}</div>
      <h3>${job['Job Title'] || 'Not specified'}</h3>
      <p><strong>Employer:</strong> ${job.Employer || 'Not specified'}</p>
      ${job.Location  ? `<p><strong>Location:</strong> ${job.Location}</p>`  : ''}
      ${job['Job Type'] ? `<p><strong>Type:</strong> ${job['Job Type']}</p>` : ''}
      ${job['Closing Date'] ? `<p><strong>Closing Date:</strong> ${job['Closing Date']}</p>` : ''}
      <button class="read-more">Read More</button>
    `;

  // 2) grab that button, wire up Data Layer + open logic
  const btn = jobCard.querySelector('.read-more');
  btn.addEventListener('click', () => {
    window.dataLayer = window.dataLayer || [];
    dataLayer.push({
      event: 'job_click',
      job_employer:       job.Employer,              // e.g. “Uniting Care”
      job_sponsored:      job.Sponsored === true,    // true / false
      job_sponsored_type: job.Category || 'none'     // e.g. “top-job”
    });
    window.open(jobURL, '_blank');
  });

  // 3) now append the card
  jobListingsContainer.appendChild(jobCard);

    });

    currentPage++;
}

// Fetch Job Listings
async function fetchJobListings() {
    const jobs = await fetchCsv('scrape/job_listings.csv');
    const sponsorships = await fetchCsv('scrape/sponsored_jobs.csv');

    const sponsorshipMap = sponsorships.reduce((map, job) => {
        map[job.ID] = job; // Map sponsorship data by job ID
        return map;
    }, {});

    const enrichedJobs = jobs.map((job) => {
        const sponsoredData = sponsorshipMap[job.ID];
        return {
            ...job,
            Sponsored: !!sponsoredData, // Add `Sponsored` boolean
            Category: sponsoredData?.Category || '', // Add category if available
        };
    });

    preRandomizedJobs = shuffleArray(enrichedJobs);
    updateJobCount(preRandomizedJobs.length);
    displayJobListings(preRandomizedJobs);
}

// Fetch and show exactly 4 latest sponsored jobs for this sector
async function fetchSponsoredJobsBySector(sector) {
    // 1. Load CSVs and build a map of sponsorship data
    const jobs         = await fetchCsv('scrape/job_listings.csv');
    const sponsorships = await fetchCsv('scrape/sponsored_jobs.csv');
    const sponsorshipMap = sponsorships.reduce((map, s) => {
      map[s.ID] = s;
      return map;
    }, {});
  
    // 2. Filter for this sector and only sponsored
    const filtered = jobs.filter(j =>
      sponsorshipMap[j.ID] && j.Sector === sector
    );
  
    // 3. Sort newest sponsorship first
    filtered.sort((a, b) =>
      new Date(sponsorshipMap[b.ID]['Sponsorship Start Date'])
        - new Date(sponsorshipMap[a.ID]['Sponsorship Start Date'])
    );
  
    // 4. Grab the top 4
    const topFour = filtered.slice(0, 4);
  
    // 5. Target your listings container
    const container = document.getElementById('job-listings');
    if (!container) {
      console.error('Container #job-listings not found');
      return;
    }
  
    // — remove only old cards & see-all button, leave header/intros alone
    container.querySelectorAll('.job-cards, .see-all-button').forEach(el => el.remove());
  
    // 6. Render each card
    topFour.forEach(job => {
      const s = sponsorshipMap[job.ID];
      const card = document.createElement('div');
      card.className = `job-cards sponsored ${s.Category.toLowerCase().replace(/\s+/g, '-')}`;
  
      // build the inner HTML without inline onclick
      card.innerHTML = `
        <div class="badge">${s.Category}</div>
        <h3>${job['Job Title'] || 'Not specified'}</h3>
        <p><strong>Employer:</strong> ${job.Employer || 'Not specified'}</p>
        ${job.Location  ? `<p><strong>Location:</strong> ${job.Location}</p>`  : ''}
        ${job['Job Type'] ? `<p><strong>Type:</strong> ${job['Job Type']}</p>` : ''}
        ${job['Closing Date'] ? `<p><strong>Closing Date:</strong> ${job['Closing Date']}</p>` : ''}
        <button class="read-more">Read More</button>
      `;
  
      // wire up the click tracker + navigation
      const btn = card.querySelector('.read-more');
      btn.addEventListener('click', () => {
        window.dataLayer = window.dataLayer || [];
        dataLayer.push({
          event: 'job_click',
          job_employer:       job.Employer || 'Unknown',
          job_sponsored:      true,
          job_sponsored_type: s.Category.toLowerCase().replace(/\s+/g, '-')
        });
        window.open(job['Job URL'], '_blank');
      });
  
      container.appendChild(card);
    });
  
    // 7. Re-add your “See All” button at the bottom
    const seeAllBtn = document.createElement('button');
    seeAllBtn.type = 'button';
    seeAllBtn.className = 'see-all-button';
    seeAllBtn.textContent = `See All ${sector} Jobs`;
    seeAllBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
    container.appendChild(seeAllBtn);
  }
  

// Update Job Count
async function updateJobCount(count) {
    const jobCountElement = document.getElementById('job-count');
    if (jobCountElement) {
        jobCountElement.textContent = `${count} Care Industry Jobs`;
    }
}

window.addEventListener('scroll', () => {
    if (document.body.dataset.sector) return;  // keep your sector-page guard
  
    // cross-browser scroll values
    const scrollTop    = window.pageYOffset
                       || document.documentElement.scrollTop
                       || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight
                       || document.body.scrollHeight;
    const clientHeight = window.innerHeight
                       || document.documentElement.clientHeight
                       || document.body.clientHeight;
  
    console.log(
      `scrollTop=${scrollTop}, clientHeight=${clientHeight}, scrollHeight=${scrollHeight}`
    );
  
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (currentPage * jobsPerPage < preRandomizedJobs.length) {
        console.log('Loading more jobs…');
        displayJobListings(preRandomizedJobs);
      } else {
        console.log('No more jobs to load.');
      }
    }
  });
  
