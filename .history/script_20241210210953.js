document.addEventListener("DOMContentLoaded", function () {
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

    const sector = document.body.getAttribute('data-sector');
    if (sector && sector.trim()) {
        fetchSponsoredJobsBySector(sector);
    } else {
        fetchJobListings();
    }
});

let currentPage = 0;
const jobsPerPage = 10;
let preRandomizedJobs = [];

function fetchSponsoredJobsBySector(sector) {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            const jobs = results.data;
            const filteredJobs = jobs.filter(
                job => job['Sponsored'] === 'true' && job['Sector'] === sector
            );
            updateJobCount(filteredJobs.length);
            displayJobListings(filteredJobs);
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
}

function fetchJobListings() {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            preRandomizedJobs = shuffleArray(results.data);
            updateJobCount(preRandomizedJobs.length);
            displayJobListings(preRandomizedJobs);
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
}

function updateJobCount(count) {
    const jobCountElement = document.getElementById('job-count');
    if (jobCountElement) {
        jobCountElement.textContent = `Showing ${count} care industry jobs`;
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function arrangeSponsoredJobs(jobs) {
    const sponsoredJobs = jobs.filter(job => job['Sponsored'] === 'true');
    const regularJobs = jobs.filter(job => job['Sponsored'] !== 'true');

    let arrangedJobs = [];
    for (let i = 0; i < jobsPerPage; i++) {
        if (i === 0 || i === 4) {
            if (sponsoredJobs.length > 0) {
                arrangedJobs.push(sponsoredJobs.shift());
            } else if (regularJobs.length > 0) {
                arrangedJobs.push(regularJobs.shift());
            }
        } else {
            if (regularJobs.length > 0) {
                arrangedJobs.push(regularJobs.shift());
            }
        }
    }

    return arrangedJobs;
}

function displayJobListings(jobs) {
    const jobListingsContainer = document.getElementById('job-listings');
    if (!jobListingsContainer) {
        console.error("Job listings container not found!");
        return;
    }

    const currentJobs = jobs.slice(
        currentPage * jobsPerPage,
        (currentPage + 1) * jobsPerPage
    );

    const arrangedJobs = arrangeSponsoredJobs(currentJobs);

    arrangedJobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-cards';

        const sponsored = job['Sponsored'] && job['Sponsored'].toLowerCase() === 'true';
        const jobURL = job['Job URL'];

        if (sponsored) {
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

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        if (currentPage * jobsPerPage < preRandomizedJobs.length) {
            displayJobListings(preRandomizedJobs);
        }
    }
});
