const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const csvParser = require('csv-parser');
const crypto = require('crypto');

// Paths for CSV files
const jobsCsvPath = 'C:\\Users\\Maca\\Documents\\find-care-jobs-mvp\\scrape\\job_listings.csv';
const sponsorshipCsvPath = 'C:\\Users\\Maca\\Documents\\find-care-jobs-mvp\\scrape\\sponsored_jobs.csv';

// Set up CSV writers
const jobsCsvWriter = createCsvWriter({
    path: jobsCsvPath,
    header: [
        { id: 'id', title: 'ID' },
        { id: 'jobTitle', title: 'Job Title' },
        { id: 'location', title: 'Location' },
        { id: 'sector', title: 'Sector' },
        { id: 'jobType', title: 'Job Type' },
        { id: 'closingDate', title: 'Closing Date' },
        { id: 'jobURL', title: 'Job URL' },
        { id: 'employer', title: 'Employer' },
        { id: 'scrapeDate', title: 'Scrape Date' }
    ]
});

// Function to generate a unique job ID
function generateJobId(job) {
    return crypto.createHash('md5').update(`${job.jobURL}-${job.employer}`).digest('hex');
}

// Load existing jobs from CSV
async function loadExistingJobs(filePath) {
    const jobs = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => jobs.push(row))
            .on('end', () => resolve(jobs))
            .on('error', reject);
    });
}

// Write jobs to CSV
async function writeJobsToCsv(jobs, filePath) {
    const writer = createCsvWriter({
        path: filePath,
        header: [
            { id: 'id', title: 'ID' },
            { id: 'jobTitle', title: 'Job Title' },
            { id: 'location', title: 'Location' },
            { id: 'sector', title: 'Sector' },
            { id: 'jobType', title: 'Job Type' },
            { id: 'closingDate', title: 'Closing Date' },
            { id: 'jobURL', title: 'Job URL' },
            { id: 'employer', title: 'Employer' },
            { id: 'scrapeDate', title: 'Scrape Date' }
        ]
    });
    await writer.writeRecords(jobs);
}

// Merge scraped jobs with existing jobs
function mergeJobs(existingJobs, scrapedJobs) {
    const existingJobsMap = existingJobs.reduce((map, job) => {
        map[job.id] = job;
        return map;
    }, {});

    const finalJobs = scrapedJobs.map((job) => {
        const id = generateJobId(job);
        const existingJob = existingJobsMap[id];
        return {
            ...job,
            id,
            scrapeDate: new Date().toISOString().split('T')[0], // Update scrape date
            ...(existingJob ? { ...existingJob } : {}) // Retain details of existing jobs
        };
    });

    // Filter out jobs no longer live in the scrape
    const scrapedJobIds = new Set(scrapedJobs.map((job) => generateJobId(job)));
    return finalJobs.filter((job) => scrapedJobIds.has(job.id));
}

// Scraping functions for each source
async function scrapeUnitingCareAgedCare(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    while (hasMoreJobs) {
        const response = await axios.get(`${url}&page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) hasMoreJobs = false;

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
                sponsored: 'false', // Default to non-sponsored
                category: '', // Default to no category
                scrapeDate
            };

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}

async function scrapeUnitingCareDisabilitySupport(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const response = await axios.get(`${url}&page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) hasMoreJobs = false;

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
                sponsored: 'false',
                category: '',
                scrapeDate
            };

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}

async function scrapeHammondCareJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const response = await axios.get(`${url}&page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) hasMoreJobs = false;

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).find('.card-title.job-search-results-card-title a').text().trim();
            const jobURL = $(element).find('.card-title.job-search-results-card-title a').attr('href');
            const location = $(element).find('.job-component-list.job-component-list-location').text().trim();
            const jobCategory = $(element).find('.job-component-list.job-component-list-category').text().trim();
            const jobType = $(element).find('.job-component-list.job-component-list-employment_type').text().trim();

            const jobData = {
                jobTitle,
                location,
                sector: 'Aged Care',
                jobType,
                jobURL,
                employer,
                sponsored: 'false',
                category: '',
                scrapeDate
            };

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}

async function scrapeWhiddonJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const response = await axios.get(`${url}?page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-link');
        if (jobsOnPage.length === 0) hasMoreJobs = false;

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
                sector: 'Aged Care',
                closingDate,
                jobURL,
                employer,
                sponsored: 'false',
                category: '',
                scrapeDate
            };

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}

async function scrapeLifeWithoutBarriersJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const response = await axios.get(`${url}?page=${currentPage}&page-items=20`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-link');
        if (jobsOnPage.length === 0) hasMoreJobs = false;

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
                sector: 'Disability Support',
                closingDate,
                jobURL,
                employer,
                sponsored: 'false',
                category: '',
                scrapeDate
            };

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}

async function scrapeLifestyleSolutionsJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const response = await axios.get(`${url}?page=${currentPage}`);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) hasMoreJobs = false;

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).find('.card-title.job-search-results-card-title a').text().trim();
            const jobURL = $(element).find('.card-title.job-search-results-card-title a').attr('href');
            const location = $(element).find('.job-component-list.job-component-list-location').text().trim();
            const jobCategory = $(element).find('.job-component-list.job-component-list-category').text().trim();
            const jobType = $(element).find('.job-component-list.job-component-list-employment_type').text().trim();

            const jobData = {
                jobTitle,
                location,
                sector: 'Disability Support',
                jobType,
                jobURL: jobURL ? 'https://careers.lifestylesolutions.org.au' + jobURL : 'Not specified',
                employer,
                sponsored: 'false',
                category: '',
                scrapeDate
            };

            jobListings.push(jobData);
        });

        currentPage++;
    }

    return jobListings;
}

async function scrapeOpalHealthcareJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        try {
            const response = await axios.get(`${url}?page=${currentPage}`, {
                maxRedirects: 5, // Allow up to 5 redirects
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
                }
            });

            // Log the final URL after redirects
            console.log(`Final URL after redirects: ${response.request.res.responseUrl}`);

            const html = response.data;
            const $ = cheerio.load(html);

            const jobsOnPage = $('.search-result');
            if (jobsOnPage.length === 0) hasMoreJobs = false;

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
                    sector: 'Aged Care',
                    closingDate,
                    jobURL,
                    employer,
                    sponsored: 'false',
                    category: '',
                    scrapeDate
                };

                jobListings.push(jobData);
            });

            currentPage++;
        } catch (error) {
            console.error(`Error scraping Opal Healthcare jobs on page ${currentPage}:`, error.message);
            hasMoreJobs = false; // Stop scraping this source if an error occurs
        }
    }

    return jobListings;
}

async function scrapeBaptistCareJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    const scrapeDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    let hasMoreJobs = true; // Start with the assumption there are more jobs

    while (hasMoreJobs) {
        console.log(`Scraping Baptist Care on page ${currentPage}...`);
        try {
            const response = await axios.get(`${url}?page=${currentPage}`);
            const html = response.data;
            const $ = cheerio.load(html);

            const jobsOnPage = $('.job-search-results-card');

            if (jobsOnPage.length === 0) {
                console.log(`No jobs found on page ${currentPage}. Stopping scrape.`);
                hasMoreJobs = false; // Stop if no jobs are found
            } else {
                jobsOnPage.each((index, element) => {
                    const jobTitle = $(element).find('.card-title.job-search-results-card-title').text().trim();
                    const jobPath = $(element).find('.card-title.job-search-results-card-title a').attr('href');
                    const jobURL = jobPath ? `https://careers.baptistcare.org.au` : 'Not specified';
                    const location = $(element).find('.job-component-list-location').text().trim() || 'Not specified';
                    const jobType = $(element).find('.job-component-list-employment_type').text().trim() || 'Not specified';

                    const jobData = {
                        jobTitle,
                        location,
                        sector: 'Aged Care',
                        jobType,
                        jobURL,
                        employer,
                        sponsored: 'false', // Default to non-sponsored
                        category: '', // Default to no category
                        scrapeDate,
                    };

                    jobListings.push(jobData);
                });

                console.log(`Scraped ${jobsOnPage.length} jobs on page ${currentPage}.`);
                currentPage++; // Move to the next page
            }
        } catch (error) {
            console.error(`Error scraping Baptist Care on page ${currentPage}:`, error.message);
            hasMoreJobs = false; // Stop if an error occurs
        }
    }

    console.log(`Total jobs scraped from Baptist Care: ${jobListings.length}`);
    return jobListings;
}

// Main function
(async () => {
    try {
        // Scrape jobs from all sources
        let scrapedJobs = [];
        scrapedJobs = scrapedJobs.concat(await scrapeUnitingCareAgedCare(TARGET_URLS[0].url, TARGET_URLS[0].employer));
        scrapedJobs = scrapedJobs.concat(await scrapeUnitingCareDisabilitySupport(TARGET_URLS[1].url, TARGET_URLS[1].employer));
        scrapedJobs = scrapedJobs.concat(await scrapeHammondCareJobs(TARGET_URLS[2].url, TARGET_URLS[2].employer));
        scrapedJobs = scrapedJobs.concat(await scrapeWhiddonJobs(TARGET_URLS[3].url, TARGET_URLS[3].employer));
        scrapedJobs = scrapedJobs.concat(await scrapeLifeWithoutBarriersJobs(TARGET_URLS[4].url, TARGET_URLS[4].employer));
        scrapedJobs = scrapedJobs.concat(await scrapeLifestyleSolutionsJobs(TARGET_URLS[5].url, TARGET_URLS[5].employer));
        scrapedJobs = scrapedJobs.concat(await scrapeOpalHealthcareJobs(TARGET_URLS[6].url, TARGET_URLS[6].employer));
        scrapedJobs = scrapedJobs.concat(await scrapeBaptistCareJobs(TARGET_URLS[7].url, TARGET_URLS[7].employer));

        // Load existing jobs
        const existingJobs = await loadExistingJobs(jobsCsvPath);

        // Merge scraped jobs with existing jobs
        const finalJobs = mergeJobs(existingJobs, scrapedJobs);

        // Write final jobs to CSV
        await writeJobsToCsv(finalJobs, jobsCsvPath);

        console.log('Job scraping and update completed.');
    } catch (error) {
        console.error('Error during scraping:', error);
    }
})();

