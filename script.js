document.addEventListener("DOMContentLoaded", function () {
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            const headerElement = document.getElementById('global-header');
            if (headerElement) {
                headerElement.innerHTML = data; // Only set innerHTML if the element exists
            }
        });

    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            const footerElement = document.getElementById('global-footer');
            if (footerElement) {
                footerElement.innerHTML = data; // Only set innerHTML if the element exists
            }
        });
});


    // Check if the page is sector-specific
    const sector = document.body.getAttribute('data-sector');
    if (sector) {
        fetchSponsoredJobsBySector(sector);
    } else {
        fetchJobListings();
    }
;

let currentPage = 0; // Track the current page of jobs
const jobsPerPage = 10; // Number of jobs to load per scroll
let allJobs = []; // Array to hold all jobs loaded from CSV

// Function to fetch and display sponsored jobs for a specific sector
function fetchSponsoredJobsBySector(sector) {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            const jobs = results.data;

            // Filter sponsored jobs for the sector
            const filteredJobs = jobs
                .filter(job => job['Sponsored'] === 'true' && job['Sector'] === sector)
                .sort((a, b) => new Date(b.scrapeDate) - new Date(a.scrapeDate)) // Sort by most recent
                .slice(0, 10); // Limit to top 10

            displayJobListings(filteredJobs); // Display filtered jobs
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
}

// Function to fetch all job listings
function fetchJobListings() {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            allJobs = results.data;
            updateJobCount(allJobs.length);
            displayJobListings(allJobs);
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
}

// Function to update the job count display
function updateJobCount(count) {
    const jobCountElement = document.getElementById('job-count');
    jobCountElement.textContent = `Search from ${count} care industry jobs`;
}

// Shuffle function to randomize job listings
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Function to group jobs by date and randomize within each group
function groupAndRandomizeJobsByDate(jobs) {
    const jobsByDate = jobs.reduce((acc, job) => {
        const date = job.scrapeDate;
        if (!acc[date]) acc[date] = [];
        acc[date].push(job);
        return acc;
    }, {});

    const randomizedJobs = [];
    Object.keys(jobsByDate)
        .sort((a, b) => new Date(b) - new Date(a))
        .forEach(date => {
            const shuffledJobs = shuffleArray(jobsByDate[date]);
            randomizedJobs.push(...shuffledJobs);
        });

    return randomizedJobs;
}

// Function to display job cards
function displayJobListings(jobs) {
    const jobListingsContainer = document.getElementById('job-listings');

    if (!jobListingsContainer) {
        console.error("Job listings container not found!");
        return;
    }

    // Clear existing listings if it's the first load
    if (currentPage === 0) {
        jobListingsContainer.innerHTML = '';
    }

    // Sort and randomize jobs within each date group
    const sortedJobs = groupAndRandomizeJobsByDate(jobs);

    // Load jobs for the current page
    sortedJobs.slice(currentPage * jobsPerPage, (currentPage + 1) * jobsPerPage).forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-cards';

        // Check if the job is sponsored and determine the category
        const sponsored = job['Sponsored'] && job['Sponsored'].toLowerCase() === 'true';
        const category = job['Category'] ? job['Category'].toLowerCase().replace(' ', '-') : '';
        const jobURL = job['Job URL'];

        // Add specific styles for sponsored jobs
        if (sponsored) {
            jobCard.classList.add('sponsored');
            if (category) {
                jobCard.classList.add(category);
            }
        }

        // Start building the job card inner HTML
        let jobCardContent = `<h3>${job['Job Title'] || 'Not specified'}</h3>`;
        jobCardContent += `<p><strong>Employer:</strong> ${job['Employer'] || 'Not specified'}</p>`;

        if (job['Location'] && job['Location'] !== 'Not specified') {
            jobCardContent += `<p><strong>Location:</strong> ${job['Location']}</p>`;
        }
        if (job['Job Type'] && job['Job Type'] !== 'Not specified') {
            jobCardContent += `<p><strong>Type:</strong> ${job['Job Type']}</p>`;
        }
        if (job['Closing Date'] && job['Closing Date'] !== 'Not specified') {
            jobCardContent += `<p><strong>Closing Date:</strong> ${job['Closing Date']}</p>`;
        }

        jobCardContent += `<button class="read-more" onclick="window.open('${jobURL}', '_blank')">Read More</button>`;

        // Employer logo for sponsored jobs
        if (sponsored && job['Employer Logo']) {
            jobCardContent = `<img src="${job['Employer Logo']}" alt="Employer Logo" class="employer-logo">` + jobCardContent;
        }

        // Add badge for sponsored jobs
        if (sponsored) {
            const badge = document.createElement('div');
            badge.className = 'badge';
            badge.innerText = job['Category'] || 'Sponsored';
            jobCardContent = badge.outerHTML + jobCardContent;
        }

        // Set the inner HTML of the job card
        jobCard.innerHTML = jobCardContent;

        // Append the job card to the container
        jobListingsContainer.appendChild(jobCard);
    });

    currentPage++;
}

// Scroll event for infinite scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        // Check if there are more jobs to load
        if (currentPage * jobsPerPage < allJobs.length) {
            displayJobListings(allJobs);
        }
    }
});
