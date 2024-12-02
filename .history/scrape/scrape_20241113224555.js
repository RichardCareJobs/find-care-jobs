const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Target URLs for scraping with associated employer names
const TARGET_URLS = [
    { url: 'https://careers.uniting.org/jobs/search?page=1&query=&category_uids%5B%5D=400c8606503e937687a9f8f39aba8f88', employer: 'Uniting Care' }, // aged care
    { url: 'https://careers.uniting.org/jobs/search?page=1&query=&category_uids%5B%5D=5b6fd8bdee29e4a5be4b41a9abb42451', employer: 'Uniting Care' }, // disability support
    { url: 'https://careers.hammond.com.au/jobs/search?page=1&query=', employer: 'Hammond Care' },
    { url: 'https://careers.whiddon.com.au/en/listing/', employer: 'Whiddon' },
    { url: 'https://careers.lwb.org.au/en/listing/', employer: 'Life Without Barriers' },
    { url: 'https://careers.lifestylesolutions.org.au/jobs/search', employer: 'Lifestyle Solutions' },
    { url: 'https://globalaus241.dayforcehcm.com/CandidatePortal/en-AU/opalhealthcare', employer: 'Opal Healthcare' }
];

// Set up CSV writer
const csvWriter = createCsvWriter({
    path: 'C:\\Users\\Maca\\Documents\\find-care-jobs-mvp\\scrape\\job_listings.csv',
    header: [
        { id: 'jobTitle', title: 'Job Title' },
        { id: 'location', title: 'Location' },
        { id: 'sector', title: 'Sector' },
        { id: 'jobType', title: 'Job Type' },
        { id: 'closingDate', title: 'Closing Date' },
        { id: 'jobURL', title: 'Job URL' },
        { id: 'employer', title: 'Employer' },
        { id: 'scrapeDate', title: 'Scrape Date' } // Add a field for the scrape date
    ]
});

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
        .sort((a, b) => new Date(b) - new Date(a)) // Sort by date in descending order
        .forEach(date => {
            const shuffledJobs = shuffleArray(jobsByDate[date]);
            randomizedJobs.push(...shuffledJobs);
        });

    return randomizedJobs;
}

// Function to scrape job listings from the Uniting Care Aged Care source
async function scrapeUnitingCareAgedCare(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        const response = await axios.get(`${url}&page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) {
            hasMoreJobs = false;
            break;
        }

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).find('.card-title.job-search-results-card-title a').text().trim();
            const jobURL = $(element).find('.card-title.job-search-results-card-title a').attr('href');
            const location = $(element).find('.job-component-list.job-component-list-location').text().trim();
            const jobType = $(element).find('.job-component-list.job-component-list-employment_type').text().trim();
            const closingDate = $(element).find('.job-component-icon-and-text.job-component-closing-on').text().trim();

            const jobData = {
                jobTitle,
                location,
                sector: 'Aged Care',
                jobType,
                closingDate,
                jobURL,
                employer,
                scrapedAt: new Date()
            };

            jobListings.push(jobData);
        });

        currentPage++; // Move to the next page
    }

    return jobListings;
}

async function scrapeUnitingCareDisabilitySupport(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        const response = await axios.get(`${url}&page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) {
            hasMoreJobs = false;
            break;
        }

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).find('.card-title.job-search-results-card-title a').text().trim();
            const jobURL = $(element).find('.card-title.job-search-results-card-title a').attr('href');
            const location = $(element).find('.job-component-list.job-component-list-location').text().trim();
            const jobType = $(element).find('.job-component-list.job-component-list-employment_type').text().trim();
            const closingDate = $(element).find('.job-component-icon-and-text.job-component-closing-on').text().trim();

            const jobData = {
                jobTitle,
                location,
                sector: 'Disability Support',
                jobType,
                closingDate,
                jobURL,
                employer,
                scrapedAt: new Date()
            };

            jobListings.push(jobData);
        });

        currentPage++; // Move to the next page
    }

    return jobListings;
}

// Function to scrape job listings from Hammond Care
async function scrapeHammondCareJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        const response = await axios.get(`${url}&page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) {
            hasMoreJobs = false;
            break;
        }

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).find('.card-title.job-search-results-card-title a').text().trim();
            const jobURL = $(element).find('.card-title.job-search-results-card-title a').attr('href');
            const location = $(element).find('.job-component-list.job-component-list-location').text().trim();
            const jobCategory = $(element).find('.job-component-list.job-component-list-category').text().trim();
            const jobType = $(element).find('.job-component-list.job-component-list-employment_type').text().trim();

            const jobData = {
                jobTitle,
                location,
                sector: jobCategory,
                jobType,
                jobURL,
                employer,
                scrapedAt: new Date()
            };

            jobListings.push(jobData);
        });

        currentPage++; // Move to the next page
    }

    return jobListings;
}

// Function to scrape job listings from Whiddon
async function scrapeWhiddonJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        const response = await axios.get(`${url}?page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-link');
        if (jobsOnPage.length === 0) {
            hasMoreJobs = false;
            break;
        }

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).text().trim() || 'Not specified';
            const jobPath = $(element).attr('href');
            const jobURL = jobPath ? 'https://careers.whiddon.com.au' + jobPath : 'Not specified';
            const location = $(element).siblings('.location').text().trim() || 'Not specified';
            const closingDate = $(element).siblings('.close-date').text().trim() || 'Not specified';

            const jobData = {
                jobTitle,
                location,
                jobType: 'Not specified',
                sector: 'Not specified',
                closingDate,
                jobURL,
                employer,
                scrapedAt: new Date()
            };

            jobListings.push(jobData);
        });

        currentPage++; // Move to the next page
    }

    return jobListings;
}

// Function to scrape job listings from Life Without Barriers
async function scrapeLifeWithoutBarriersJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        const response = await axios.get(`${url}?page=${currentPage}&page-items=20`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-link');
        if (jobsOnPage.length === 0) {
            hasMoreJobs = false;
            break;
        }

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).text().trim() || 'Not specified';
            const jobPath = $(element).attr('href');
            const jobURL = jobPath ? 'https://careers.lwb.org.au' + jobPath : 'Not specified';
            const location = $(element).siblings('.location').text().trim() || 'Not specified';
            const closingDate = $(element).siblings('.close-date').text().trim() || 'Not specified';

            const jobData = {
                jobTitle,
                location,
                jobType: 'Not specified',
                sector: 'Not specified',
                closingDate,
                jobURL,
                employer,
                scrapedAt: new Date()
            };

            jobListings.push(jobData);
        });

        currentPage++; // Move to the next page
    }

    return jobListings;
}

// Function to scrape job listings from the Lifestyle Solutions source
async function scrapeLifestyleSolutionsJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        const response = await axios.get(`${url}?page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) {
            hasMoreJobs = false;
            break;
        }

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).find('.card-title.job-search-results-card-title a').text().trim();
            const jobURL = $(element).find('.card-title.job-search-results-card-title a').attr('href');
            const location = $(element).find('.job-component-list.job-component-list-location').text().trim();
            const jobCategory = $(element).find('.job-component-list.job-component-list-category').text().trim();
            const jobType = $(element).find('.job-component-list.job-component-list-employment_type').text().trim();

            const jobData = {
                jobTitle,
                location,
                sector: jobCategory,
                jobType,
                jobURL: jobURL ? 'https://careers.lifestylesolutions.org.au' + jobURL : 'Not specified',
                employer,
                scrapedAt: new Date()
            };

            jobListings.push(jobData);
        });

        currentPage++; // Move to the next page
    }

    return jobListings;
}

// Function to scrape job listings from Opal Healthcare
async function scrapeOpalHealthcareJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        const response = await axios.get(`${url}?page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.search-result');
        if (jobsOnPage.length === 0) {
            hasMoreJobs = false;
            break;
        }

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).find('.posting-title a').text().trim() || 'Not specified';
            const jobPath = $(element).find('.posting-title a').attr('href');
            const jobURL = jobPath ? 'https://globalaus241.dayforcehcm.com' + jobPath : 'Not specified';
            const location = $(element).find('.posting-subtitle').text().trim() || 'Not specified';
            const closingDate = 'Not specified';

            const jobData = {
                jobTitle,
                location,
                jobType: 'Not specified',
                sector: 'Not specified',
                closingDate,
                jobURL,
                employer,
                scrapedAt: new Date()
            };

            jobListings.push(jobData);
        });

        currentPage++; // Move to the next page
    }

    return jobListings;
}

// Main function to orchestrate scraping from multiple sources
async function scrapeAllJobs() {
    let allJobListings = [];
    allJobListings = allJobListings.concat(await scrapeExampleJobs(TARGET_URLS[0].url, TARGET_URLS[0].employer));

    allJobListings = allJobListings.concat(await scrapeUnitingCareAgedCare(TARGET_URLS[0].url, TARGET_URLS[0].employer));
    allJobListings = allJobListings.concat(await scrapeUnitingCareDisabilitySupport(TARGET_URLS[1].url, TARGET_URLS[1].employer));
    allJobListings = allJobListings.concat(await scrapeHammondCareJobs(TARGET_URLS[2].url, TARGET_URLS[2].employer));
    allJobListings = allJobListings.concat(await scrapeWhiddonJobs(TARGET_URLS[3].url, TARGET_URLS[3].employer));
    allJobListings = allJobListings.concat(await scrapeLifeWithoutBarriersJobs(TARGET_URLS[4].url, TARGET_URLS[4].employer));
    allJobListings = allJobListings.concat(await scrapeLifestyleSolutionsJobs(TARGET_URLS[5].url, TARGET_URLS[5].employer));
    allJobListings = allJobListings.concat(await scrapeOpalHealthcareJobs(TARGET_URLS[6].url, TARGET_URLS[6].employer));

    console.log('All Job Listings:', allJobListings);

    // Group by scrape date and randomize within each group
    const randomizedJobListings = groupAndRandomizeJobsByDate(allJobListings);

    // Write to CSV
    await csvWriter.writeRecords(randomizedJobListings);
    console.log('Job listings have been written to job_listings.csv with randomized order by date.');
}

// Call the function
scrapeAllJobs().catch(error => console.error('Error in scraping:', error));
