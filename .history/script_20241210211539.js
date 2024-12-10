document.addEventListener("DOMContentLoaded", function () {
    // Load header and footer
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            const headerElement = document.getElementById('global-header');
            if (headerElement) {
                headerElement.innerHTML = data;
            }
        });

    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            const footerElement = document.getElementById('global-footer');
            if (footerElement) {
                footerElement.innerHTML = data;
            }
        });

    // Determine whether the page is sector-specific
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

/**
 * Fetch and display sponsored jobs for a specific sector
 */
function fetchSponsoredJobsBySector(sector) {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            const jobs = normalizeSponsoredField(results.data);

            // Filter and sort sector-specific sponsored jobs
            const filteredJobs = jobs
                .filter(job => job['Sponsored'] === true && job['Sector'] === sector)
                .sort((a, b) => new Date(b.scrapeDate) - new Date(a.scrapeDate));

            // Pre-randomize jobs for consistent pagination
            preRandomizedJobs = shuffleArray(filteredJobs);

            // Initialize job listings display
            displayJobListings(preRandomizedJobs);
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
}

/**
 * Fetch all job listings and initialize randomization
 */
function fetchJobListings() {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            const jobs = normalizeSponsoredField(results.data);

            // Pre-randomize jobs for consistent pagination
            preRandomizedJobs = shuffleArray(jobs);

            // Initialize job listings display
            displayJobListings(preRandomizedJobs);
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
}

/**
 * Normalize the "Sponsored" field for consistent filtering
 */
function normalizeSponsoredField(jobs) {
    return jobs.map(job => ({
        ...job,
        Sponsored: job['Sponsored'] ? job['Sponsored'].toString().toLowerCase() === 'true' : false
    }));
}

/**
 * Shuffle an array to randomize its elements
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Arrange jobs for each page to include sponsored jobs in specific positions
 */
function arrangeSponsoredJobs(jobs, pageIndex, pageSize) {
    const sponsoredJobs = jobs.filter(job => job['Sponsored'] === true);
    const regularJobs = jobs.filter(job => job['Sponsored'] !== true);

    const arrangedJobs = [];
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;

    for (let i = startIndex; i < endIndex; i++) {
        const position = i % pageSize;
        if ((position === 0 || position === 4) && sponsoredJobs.length > 0) {
            arrangedJobs.push(sponsoredJobs.shift());
        } else if (regularJobs.length > 0) {
            arrangedJobs.push(regularJobs.shift());
        }
    }

    return arrangedJobs;
}

/**
 * Display job listings for the current page
 */
function displayJobListings(jobs) {
    const jobListingsContainer = document.getElementById('job-listings');
    if (!jobListingsContainer) {
        console.error("Job listings container not found!");
        return;
    }

    // Only process jobs for the current page
    const currentJobs = jobs.slice(
        currentPage * jobsPerPage,
        (currentPage + 1) * jobsPerPage
    );

    // Arrange jobs for the current page
    const arrangedJobs = arrangeSponsoredJobs(jobs, currentPage, jobsPerPage);

    // Render arranged jobs
    arrangedJobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-cards';

        const isSponsored = job['Sponsored'] === true;
        const jobURL = job['Job URL'];

        // Add sponsored styles and badge
        if (isSponsored) {
            jobCard.classList.add('sponsored');
            jobCard.innerHTML += `<div class="badge">${job['Category'] || 'Sponsored'}</div>`;
        }

        // Build job card content
        jobCard.innerHTML += `
            <h3>${job['Job Title'] || 'Not specified'}</h3>
            <p><strong>Employer:</strong> ${job['Employer'] || 'Not specified'}</p>
            ${job['Location'] ? `<p><strong>Location:</strong> ${job['Location']}</p>` : ''}
            ${job['Job Type'] ? `<p><strong>Type:</strong> ${job['Job Type']}</p>` : ''}
            ${job['Closing Date'] ? `<p><strong>Closing Date:</strong> ${job['Closing Date']}</p>` : ''}
            <button class="read-more" onclick="window.open('${jobURL}', '_blank')">Read More</button>
        `;

        // Append the job card to the container
        jobListingsContainer.appendChild(jobCard);
    });

    currentPage++;
}

/**
 * Infinite scroll event listener
 */
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
        // Load more jobs if available
        if (currentPage * jobsPerPage < preRandomizedJobs.length) {
            displayJobListings(preRandomizedJobs);
        }
    }
});
