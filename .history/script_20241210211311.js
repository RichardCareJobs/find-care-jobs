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

function fetchSponsoredJobsBySector(sector) {
    Papa.parse('scrape/job_listings.csv', {
        download: true,
        header: true,
        complete: function (results) {
            const jobs = results.data.filter(
                job => job['Sponsored'] === 'true' && job['Sector'] === sector
            );
            displayJobListings(jobs);
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
            const jobs = results.data;
            displayJobListings(jobs);
        },
        error: function (error) {
            console.error('Error fetching the CSV file:', error);
        }
    });
}

function normalizeSponsoredField(jobs) {
    return jobs.map(job => ({
        ...job,
        Sponsored: job['Sponsored'] ? job['Sponsored'].toString().toLowerCase() === 'true' : false
    }));
}

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

function debugLog(arrangedJobs, pageIndex) {
    console.log(`Page ${pageIndex + 1} - Arranged Jobs:`);
    arrangedJobs.forEach((job, index) => {
        console.log(`Position ${index + 1}:`, job['Sponsored'] === true ? 'Sponsored' : 'Regular');
    });
}

function displayJobListings(jobs) {
    const jobListingsContainer = document.getElementById('job-listings');
    if (!jobListingsContainer) {
        console.error("Job listings container not found!");
        return;
    }

    const normalizedJobs = normalizeSponsoredField(jobs);
    const arrangedJobs = arrangeSponsoredJobs(normalizedJobs, currentPage, jobsPerPage);

    debugLog(arrangedJobs, currentPage);

    arrangedJobs.forEach(job => {
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

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        displayJobListings(preRandomizedJobs);
    }
});
