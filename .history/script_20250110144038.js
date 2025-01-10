document.addEventListener('DOMContentLoaded', function () {
    fetch('header.html')
        .then((response) => response.text())
        .then((data) => {
            const headerElement = document.getElementById('global-header');
            if (headerElement) {
                headerElement.innerHTML = data;
            }
        });

    fetch('footer.html')
        .then((response) => response.text())
        .then((data) => {
            const footerElement = document.getElementById('global-footer');
            if (footerElement) {
                footerElement.innerHTML = data;
            }
        });

    resetSponsoredJobs(); // Clear used sponsored jobs on page load

    const sector = document.body.getAttribute('data-sector');
    if (sector && sector.trim()) {
        fetchSponsoredJobsBySector(sector);
    } else {
        fetchJobListings();
    }
});

let currentPage = 0; // Current page of jobs
const jobsPerPage = 10; // Number of jobs per page
let preRandomizedJobs = []; // Jobs randomized and ready for pagination
let usedSponsoredJobs = []; // Track used sponsored jobs

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
            jobCard.innerHTML += `<div class="badge">${job['Category'] || 'Sponsored'}</div>`;
        }

        jobCard.innerHTML += `
            <h3>${job['Job Title'] || 'Not specified'}</h3>
            <p><strong>Employer:</strong> ${job['Employer'] || 'Not specified'}</p>
            ${job['Location'] ? `<p><strong>Location:</strong> ${job['Location']}</p>` : ''}
            ${job['Job Type'] ? `<p><strong>Type:</strong> ${job['Job Type']}</p>` : ''}
            ${job['Closing Date'] ? `<p><strong>Closing Date:</strong> ${job['Closing Date']}</p>` : ''}
            <button class="read-more" onclick="window.open('${jobURL}', '_blank')">Read More</button>
        `;

        jobListingsContainer.appendChild(jobCard);
    });

    currentPage++;
}

// Fetch Job Listings
function fetchJobListings() {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            const jobs = normalizeSponsoredField(results.data);
            preRandomizedJobs = shuffleArray(jobs);
            updateJobCount(preRandomizedJobs.length); // Update job count
            displayJobListings(preRandomizedJobs);
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        },
    });
}

// Fetch Sponsored Jobs by Sector
function fetchSponsoredJobsBySector(sector) {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            const jobs = normalizeSponsoredField(results.data);
            const filteredJobs = jobs
                .filter((job) => job['Sponsored'] === true && job['Sector'] === sector)
                .sort((a, b) => new Date(b.scrapeDate) - new Date(a.scrapeDate));

            preRandomizedJobs = shuffleArray(filteredJobs);
            displayJobListings(preRandomizedJobs);
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        },
    });
}

// Update Job Count
async function updateJobCount(count) {
    const jobCountElement = document.getElementById('job-count');
    if (jobCountElement) {
        jobCountElement.textContent = `${count} Care Industry Jobs`;
    }
}

// Infinite Scroll Event
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
        if (currentPage * jobsPerPage < preRandomizedJobs.length) {
            displayJobListings(preRandomizedJobs);
        }
    }
});
