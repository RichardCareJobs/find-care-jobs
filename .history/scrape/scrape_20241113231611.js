document.addEventListener("DOMContentLoaded", function () {
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('global-header').innerHTML = data;
        });

    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('global-footer').innerHTML = data;
        });
});

let currentPage = 0; // Track the current page of jobs
const jobsPerPage = 10; // Number of jobs to load per scroll
let allJobs = []; // Array to hold all jobs loaded from CSV

document.addEventListener('DOMContentLoaded', function() {
    fetchJobListings();

    // Search function
    function performSearch() {
        const jobTitle = document.getElementById('job-title').value.toLowerCase().trim();
        const location = document.getElementById('location').value.toLowerCase().trim();

        Papa.parse('scrape/job_listings.csv', {
            download: true,
            header: true,
            complete: function(results) {
                const filteredJobs = results.data.filter(job => {
                    const jobLocation = job['Location'] ? job['Location'].toLowerCase().trim() : '';
                    return (job['Job Title'].toLowerCase().includes(jobTitle) || jobTitle === '') &&
                           (jobLocation.includes(location) || location === '');
                });

                currentPage = 0;
                updateJobCount(filteredJobs.length);
                displayJobListings(filteredJobs);
            },
            error: function(error) {
                console.error('Error fetching the CSV file:', error);
            }
        });
    }

    document.getElementById('search-button').addEventListener('click', performSearch);

    document.getElementById('job-title').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    document.getElementById('location').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
});

// Function to update the job count display
function updateJobCount(count) {
    const jobCountElement = document.getElementById('job-count');
    jobCountElement.textContent = `Search from ${count} care industry jobs`;
}

// Function to fetch job data from CSV and display it
function fetchJobListings() {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function(results) {
            allJobs = results.data;
            updateJobCount(allJobs.length);
            displayJobListings(allJobs);
        },
        error: function(error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
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
        const sponsored = job['Sponsored'] && job['Sponsored'].toLowerCase() === 'yes';
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
