const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const csvParser = require('csv-parser');

// Define the CSV path
const csvPath = 'C:\\Users\\Maca\\Documents\\find-care-jobs-mvp\\scrape\\job_listings.csv';

// Set up CSV writer with necessary fields
const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
        { id: 'jobTitle', title: 'Job Title' },
        { id: 'location', title: 'Location' },
        { id: 'sector', title: 'Sector' },
        { id: 'jobType', title: 'Job Type' },
        { id: 'closingDate', title: 'Closing Date' },
        { id: 'jobURL', title: 'Job URL' },
        { id: 'employer', title: 'Employer' },
        { id: 'category', title: 'Category' },
        { id: 'sponsored', title: 'Sponsored' },
        { id: 'sponsorshipStartDate', title: 'Sponsorship Start Date' },
        { id: 'scrapeDate', title: 'Scrape Date' }
    ]
});

// Load existing jobs with sponsorship and category data from CSV
async function loadExistingJobs() {
    const existingJobs = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csvParser())
            .on('data', (row) => {
                existingJobs.push(row);
            })
            .on('end', () => {
                resolve(existingJobs);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

// Update or append job listings
async function updateJobListings(newJobListings) {
    const existingJobs = await loadExistingJobs();

    const updatedJobs = newJobListings.map((job) => {
        const existingJob = existingJobs.find(
            (ej) => ej.jobURL === job.jobURL && ej.employer === job.employer
        );

        if (existingJob) {
            job.sponsored = existingJob.sponsored;
            job.category = existingJob.category;
            job.sponsorshipStartDate = existingJob.sponsorshipStartDate;

            if (job.sponsored === 'true') {
                const sponsorshipStartDate = new Date(existingJob.sponsorshipStartDate);
                const currentDate = new Date();
                const daysSponsored = (currentDate - sponsorshipStartDate) / (1000 * 60 * 60 * 24);

                if (daysSponsored > 30) {
                    job.sponsored = 'false';
                    job.sponsorshipStartDate = ''; 
                }
            }
        } else {
            job.sponsored = 'false';
            job.category = '';
            job.sponsorshipStartDate = '';
        }

        return job;
    });

    await csvWriter.writeRecords(updatedJobs);
    console.log('Job listings have been updated in job_listings.csv');
}

// Target URLs for scraping with associated employer names
const TARGET_URLS = [
    {
        url: 'https://careers.uniting.org/jobs/search?page=1&query=&category_uids%5B%5D=400c8606503e937687a9f8f39aba8f88',
        employer: 'Uniting Care' // aged care
    },
    {
        url: 'https://careers.uniting.org/jobs/search?page=1&query=&category_uids%5B%5D=5b6fd8bdee29e4a5be4b41a9abb42451',
        employer: 'Uniting Care' // disability support
    },
    {
        url: 'https://careers.hammond.com.au/jobs/search?page=1&cities%5B%5D=Cardiff&cities%5B%5D=Central+Coast+NSW&cities%5B%5D=Erina&cities%5B%5D=Gosford&cities%5B%5D=Scone&cities%5B%5D=Singleton&cities%5B%5D=Taree&cities%5B%5D=Waratah&cities%5B%5D=Woy+Woy&query=',
        employer: 'Hammond Care'
    },
    {
        url: 'https://careers.whiddon.com.au/en/listing/',
        employer: 'Whiddon'
    },
    {
        url: 'https://careers.lwb.org.au/en/listing/',
        employer: 'Life Without Barriers'
    },
    {
        url: 'https://careers.lifestylesolutions.org.au/jobs/search',
        employer: 'Lifestyle Solutions'
    },
    {
        url: 'https://globalaus241.dayforcehcm.com/CandidatePortal/en-AU/opalhealthcare',
        employer: 'Opal Healthcare'
    }
];


// Helper function to randomize jobs within each date group
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Group and randomize jobs by scrape date
function groupAndRandomizeJobs(jobs) {
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
                jobTitle: jobTitle || 'Not specified',
                location: location || 'Not specified',
                sector: 'Aged Care',
                jobType: jobType || 'Not specified',
                closingDate: closingDate || 'Not specified',
                jobURL: jobURL || 'Not specified',
                employer: employer || 'Not specified',
                category: '',
                sponsored: 'false',
                sponsorshipStartDate: '',
                scrapeDate: new Date().toISOString().split('T')[0]
            };

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}

// Function to scrape job listings from the Uniting Care Diability Support source
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
                jobTitle: jobTitle || 'Not specified',
                location: location || 'Not specified',
                sector: 'Aged Care',
                jobType: jobType || 'Not specified',
                closingDate: closingDate || 'Not specified',
                jobURL: jobURL || 'Not specified',
                employer: employer || 'Not specified',
                category: '',
                sponsored: 'false',
                sponsorshipStartDate: '',
                scrapeDate: new Date().toISOString().split('T')[0]
            };
            
            

            jobListings.push(jobData);
        });

        currentPage++;
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
            const jobTitle = $(element).find('.card-title.job-search-results-card-title a').text().trim() || 'Not specified';
            const jobURL = $(element).find('.card-title.job-search-results-card-title a').attr('href') || 'Not specified';
            const location = $(element).find('.job-component-list.job-component-list-location').text().trim() || 'Not specified';
            const jobCategory = $(element).find('.job-component-list.job-component-list-category').text().trim() || 'Not specified';
            const jobType = $(element).find('.job-component-list.job-component-list-employment_type').text().trim() || 'Not specified';
            const closingDate = $(element).find('.job-component-icon-and-text.job-component-closing-on').text().trim() || 'Not specified';

            const jobData = {
                jobTitle,
                location,
                sector: jobCategory,  // Assign sector explicitly if needed
                jobType,
                closingDate,
                jobURL,
                employer,
                category: '',  // Default to empty for manual input
                sponsored: 'false',  // Default to 'false' if not defined
                sponsorshipStartDate: ''  // Set to empty string if not defined
            };

            jobListings.push(jobData);
        });

        currentPage++;
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
            const jobType = 'Not specified';  // Set jobType explicitly since it might not be available in this source
            const closingDate = $(element).siblings('.close-date').text().trim() || 'Not specified';

            const jobData = {
                jobTitle,
                location,
                sector: 'Not specified',  // Set a default value if sector is not available
                jobType,
                closingDate,
                jobURL,
                employer,
                category: '',  // Default to empty for manual input
                sponsored: 'false',  // Default to 'false' if not defined
                sponsorshipStartDate: ''  // Set to empty string if not defined
            };

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}


// Function to scrape job listings from Life Without Barriers
async function scrapeLifeWitoutBarriersJobs(url, employer) {
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
                jobTitle: jobTitle || 'Not specified',
                location: location || 'Not specified',
                sector: 'Aged Care',
                jobType: jobType || 'Not specified',
                closingDate: closingDate || 'Not specified',
                jobURL: jobURL || 'Not specified',
                employer: employer || 'Not specified',
                category: '',
                sponsored: 'false',
                sponsorshipStartDate: '',
                scrapeDate: new Date().toISOString().split('T')[0]
            };
            

            jobListings.push(jobData);
        });

        currentPage++;
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
                jobTitle: jobTitle || 'Not specified',
                location: location || 'Not specified',
                sector: 'Aged Care',
                jobType: jobType || 'Not specified',
                closingDate: closingDate || 'Not specified',
                jobURL: jobURL || 'Not specified',
                employer: employer || 'Not specified',
                category: '',
                sponsored: 'false',
                sponsorshipStartDate: '',
                scrapeDate: new Date().toISOString().split('T')[0]
            };
            

            jobListings.push(jobData);
        });

        currentPage++;
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
                jobTitle: jobTitle || 'Not specified',
                location: location || 'Not specified',
                sector: 'Aged Care',
                jobType: jobType || 'Not specified',
                closingDate: closingDate || 'Not specified',
                jobURL: jobURL || 'Not specified',
                employer: employer || 'Not specified',
                category: '',
                sponsored: 'false',
                sponsorshipStartDate: '',
                scrapeDate: new Date().toISOString().split('T')[0]
            };
            

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}

// Main function to orchestrate scraping from multiple sources
async function scrapeAllJobs() {
    let allJobListings = [];

    allJobListings = allJobListings.concat(await scrapeUnitingCareAgedCare(TARGET_URLS[0].url, TARGET_URLS[0].employer));
    allJobListings = allJobListings.concat(await scrapeUnitingCareDisabilitySupport(TARGET_URLS[1].url, TARGET_URLS[1].employer));
    allJobListings = allJobListings.concat(await scrapeHammondCareJobs(TARGET_URLS[2].url, TARGET_URLS[2].employer));
    allJobListings = allJobListings.concat(await scrapeWhiddonJobs(TARGET_URLS[3].url, TARGET_URLS[3].employer));
    allJobListings = allJobListings.concat(await scrapeLifeWitoutBarriersJobs(TARGET_URLS[4].url, TARGET_URLS[4].employer));
    allJobListings = allJobListings.concat(await scrapeLifestyleSolutionsJobs(TARGET_URLS[5].url, TARGET_URLS[5].employer));
    allJobListings = allJobListings.concat(await scrapeOpalHealthcareJobs(TARGET_URLS[6].url, TARGET_URLS[6].employer));

    console.log('All Job Listings:', allJobListings);

    if (allJobListings.length === 0) {
        console.warn('No jobs were scraped. Ensure scraping functions are properly implemented.');
        return;
    }

    const randomizedJobListings = groupAndRandomizeJobs(allJobListings);

    await updateJobListings(randomizedJobListings);
}

scrapeAllJobs().catch(error => {
    console.error('Error in scraping:', error);
});
