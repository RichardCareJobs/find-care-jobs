const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const csvParser = require('csv-parser');

// Target URLs for scraping with associated employer names
const TARGET_URLS = [
    { url: 'https://careers.uniting.org/jobs/search?page=1&query=&category_uids%5B%5D=400c8606503e937687a9f8f39aba8f88', employer: 'Uniting Care' }, // aged care
    { url: 'https://careers.uniting.org/jobs/search?page=1&query=&category_uids%5B%5D=5b6fd8bdee29e4a5be4b41a9abb42451', employer: 'Uniting Care' }, // disability support
    { url: 'https://careers.hammond.com.au/jobs/search?page=1&query=', employer: 'Hammond Care' },
    { url: 'https://careers.whiddon.com.au/en/listing/', employer: 'Whiddon' },
    { url: 'https://careers.lwb.org.au/en/listing/', employer: 'Life Without Barriers' },
    { url: 'https://careers.lifestylesolutions.org.au/jobs/search', employer: 'Lifestyle Solutions' },
    { url: 'https://globalaus242.dayforcehcm.com/CandidatePortal/en-AU/opalhealthcare', employer: 'Opal Healthcare' },
    { url: 'https://careers.baptistcare.org.au/jobs/search', employer: 'Baptist Care' }
];

// Define the CSV path
const csvPath = 'C:\\Users\\Maca\\Documents\\find-care-jobs-mvp\\scrape\\job_listings.csv';


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
        { id: 'sponsored', title: 'Sponsored' },
        { id: 'category', title: 'Category' },
        { id: 'sponsorshipStartDate', title: 'Sponsorship Start Date' },
        { id: 'scrapeDate', title: 'Scrape Date' }
    ]
});

// Function to load existing jobs from the CSV file
async function loadExistingJobs() {
    const existingJobs = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csvParser())
            .on('data', (row) => existingJobs.push(row))
            .on('end', () => resolve(existingJobs))
            .on('error', (err) => reject(err));
    });
}


// Function to merge existing and scraped jobs
function mergeData(existingJobs, scrapedJobs) {
    // Create a Set of job URLs and employers from scraped jobs for quick lookup
    const scrapedJobsSet = new Set(
        scrapedJobs.map(job => `${job.jobURL}-${job.employer}`)
    );

    // Remove jobs from the existing dataset if they are not in the scraped dataset
    const filteredExistingJobs = existingJobs.filter(existingJob =>
        scrapedJobsSet.has(`${existingJob.jobURL}-${existingJob.employer}`)
    );

    // Merge existing data with scraped data
    const mergedData = scrapedJobs.map(scrapedJob => {
        const existingJob = filteredExistingJobs.find(job =>
            job.jobURL === scrapedJob.jobURL && job.employer === scrapedJob.employer
        );

        if (existingJob) {
            // Retain sponsorship details
            scrapedJob.sponsored = existingJob.sponsored;
            scrapedJob.category = existingJob.category;
            scrapedJob.sponsorshipStartDate = existingJob.sponsorshipStartDate;

            // Check for sponsorship expiration
            if (scrapedJob.sponsored === 'true') {
                const sponsorshipStartDate = new Date(existingJob.sponsorshipStartDate);
                const daysSponsored = (new Date() - sponsorshipStartDate) / (1000 * 60 * 60 * 24);
                if (daysSponsored > 30) {
                    scrapedJob.sponsored = 'false';
                    scrapedJob.category = '';
                    scrapedJob.sponsorshipStartDate = '';
                }
            }
        } else {
            // Default values for new jobs
            scrapedJob.sponsored = 'false';
            scrapedJob.category = '';
            scrapedJob.sponsorshipStartDate = '';
        }

        return scrapedJob;
    });

    return mergedData;
}



// Helper function to randomize job listings within each date
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

// Scraping fun ctions for each source
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
                    const jobURL = jobPath ? `https://careers.baptistcare.org.au${jobPath}` : 'Not specified';
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




// Main function to orchestrate scraping from multiple sources
async function scrapeAllJobs() {
    let allJobListings = [];
    allJobListings = allJobListings.concat(await scrapeUnitingCareAgedCare(TARGET_URLS[0].url, TARGET_URLS[0].employer));
    allJobListings = allJobListings.concat(await scrapeUnitingCareDisabilitySupport(TARGET_URLS[1].url, TARGET_URLS[1].employer));
    allJobListings = allJobListings.concat(await scrapeHammondCareJobs(TARGET_URLS[2].url, TARGET_URLS[2].employer));
    allJobListings = allJobListings.concat(await scrapeWhiddonJobs(TARGET_URLS[3].url, TARGET_URLS[3].employer));
    allJobListings = allJobListings.concat(await scrapeLifeWithoutBarriersJobs(TARGET_URLS[4].url, TARGET_URLS[4].employer));
    allJobListings = allJobListings.concat(await scrapeLifestyleSolutionsJobs(TARGET_URLS[5].url, TARGET_URLS[5].employer));
    allJobListings = allJobListings.concat(await scrapeOpalHealthcareJobs(TARGET_URLS[6].url, TARGET_URLS[6].employer));
    allJobListings = allJobListings.concat(await scrapeBaptistCareJobs(TARGET_URLS[7].url, TARGET_URLS[7].employer));

    // Group by scrape date and randomize within each group
    const randomizedJobListings = groupAndRandomizeJobsByDate(allJobListings);

    // Load existing jobs and merge with scraped data
    const existingJobs = await loadExistingJobs();
    const finalJobList = mergeData(existingJobs, randomizedJobListings);

    // Write the merged job listings to CSV
    await csvWriter.writeRecords(finalJobList);
    console.log('Job listings have been written to job_listings.csv with randomized order by date.');
}


(async () => {
    try {
        await scrapeAllJobs();
    } catch (error) {
        console.error('Error in scraping:', error);
    }
})();

