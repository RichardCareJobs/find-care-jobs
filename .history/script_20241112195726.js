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
    // Now fetch and display the job listings after the DOM is fully loaded
    fetchJobListings();

       // Search function
function performSearch() {
    const jobTitle = document.getElementById('job-title').value.toLowerCase().trim(); // Trimming whitespace
    const location = document.getElementById('location').value.toLowerCase().trim(); // Trimming whitespace
    
    // Re-fetch jobs and filter based on input
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function(results) {
            const filteredJobs = results.data.filter(job => {
                // Ensure we're doing case-insensitive matching
                const jobLocation = job['Location'] ? job['Location'].toLowerCase().trim() : '';
                return (job['Job Title'].toLowerCase().includes(jobTitle) || jobTitle === '') &&
                       (jobLocation.includes(location) || location === '');
            });

            currentPage = 0; // Reset current page for filtered results
            updateJobCount(filteredJobs.length); // Update job count display for filtered results
            displayJobListings(filteredJobs); // Display filtered jobs
        },
        error: function(error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
}

// Trigger search when the search button is clicked
document.getElementById('search-button').addEventListener('click', performSearch);

// Trigger search when the user presses the Enter key
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
    jobCountElement.textContent = `Search from ${count} care industry jobs`; // Updated text
}


// Function to fetch job data from CSV and display it
function fetchJobListings() {
    Papa.parse('scrape/job_listings.csv', { // Ensure correct path to the CSV
        download: true,
        header: true,
        complete: function(results) {
            allJobs = results.data; // Populate allJobs with fetched data
            updateJobCount(allJobs.length); // Update job count display
            displayJobListings(allJobs); // Display the initial set of jobs
        },
        error: function(error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
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

    // Sort jobs by the scraped timestamp in descending order (latest first)
    const sortedJobs = jobs.sort((a, b) => {
        return new Date(b.scrapedAt) - new Date(a.scrapedAt);
    });

    // Load jobs for the current page
    jobs.slice(currentPage * jobsPerPage, (currentPage + 1) * jobsPerPage).forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-cards';

        // Check if the job is sponsored and determine the category
        const sponsored = job['Sponsored']; // You would add this field in your CSV
        const category = job['Category'];  // Categories like 'Top Job', 'Featured Job'
        const jobURL = job['Job URL'];
        
        // Add specific styles for sponsored jobs
        if (sponsored === 'Yes') {
            jobCard.classList.add('sponsored', category.toLowerCase().replace(' ', '-')); // Add class based on category
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

        // Employer logo for sponsored jobs (optional, check if the logo is available)
        if (job['Employer Logo']) {
            jobCardContent = `<img src="${job['Employer Logo']}" alt="Employer Logo" class="employer-logo">` + jobCardContent;
        }

        // Add badge for sponsored jobs
        if (sponsored === 'Yes') {
            const badge = document.createElement('div');
            badge.className = 'badge';
            badge.innerText = category; // Set the category as badge text
            jobCardContent = badge.outerHTML + jobCardContent; // Prepend badge to the job card content
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

