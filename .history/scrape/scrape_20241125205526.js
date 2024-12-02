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
    { url: 'https://globalaus242.dayforcehcm.com/CandidatePortal/en-AU/opalhealthcare', employer: 'Opal Healthcare' }
];

// Define the CSV path
const csvPath = 'C:\\Users\\Maca\\Documents\\find-care-jobs-mvp\\scrape\\job_listings.csv';

// Set up CSV writer
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
        { id: 'sponsored', title: 'Sponsored' },
        { id: 'category', title: 'Category' },
        { id: 'sponsorshipStartDate', title: 'Sponsorship Start Date' },
        { id: 'scrapeDate', title: 'Scrape Date' }
    ]
});

// Load existing jobs
async function loadExistingJobs() {
    const existingJobs = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csvParser())
            .on('data', (row) => existingJobs.push(row))
            .on('end', () => resolve(existingJobs))
            .on('error', reject);
    });
}

// Update job listings
async function updateJobListings(newJobListings) {
    console.log("Starting updateJobListings...");
    const existingJobs = await loadExistingJobs();
    console.log(`Loaded ${existingJobs.length} existing jobs from CSV.`);

    const existingJobsMap = existingJobs.reduce((map, job) => {
        map[job.jobURL] = job;
        return map;
    }, {});

    const updatedJobs = newJobListings.map((job) => {
        const existingJob = existingJobsMap[job.jobURL];
        if (existingJob) {
            job.sponsored = existingJob.sponsored;
            job.category = existingJob.category;
            job.sponsorshipStartDate = existingJob.sponsorshipStartDate;

            if (existingJob.sponsored === 'true') {
                const daysSponsored = (new Date() - new Date(existingJob.sponsorshipStartDate)) / (1000 * 60 * 60 * 24);
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

    console.log(`Final job count after merging: ${updatedJobs.length}`);
    await csvWriter.writeRecords(updatedJobs);
    console.log("CSV updated successfully.");
}

// Scraping logic for each source
async function scrapeUnitingCareJobs(url, employer, sector) {
    const jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        try {
            const response = await axios.get(`${url}&page=${currentPage}`);
            const $ = cheerio.load(response.data);

            const jobsOnPage = $('.job-search-results-card');
            if (jobsOnPage.length === 0) hasMoreJobs = false;

            jobsOnPage.each((_, element) => {
                const jobTitle = $(element).find('.card-title a').text().trim();
                const jobURL = $(element).find('.card-title a').attr('href');
                const location = $(element).find('.job-component-list-location').text().trim();
                const jobType = $(element).find('.job-component-list-employment_type').text().trim();
                const closingDate = $(element).find('.job-component-closing-on').text().trim();

                jobListings.push({
                    jobTitle,
                    location,
                    sector,
                    jobType,
                    closingDate,
                    jobURL: jobURL ? `https://careers.uniting.org${jobURL}` : 'Not specified',
                    employer,
                    sponsored: 'false',
                    category: '',
                    scrapeDate: new Date().toISOString().split('T')[0]
                });
            });

            console.log(`Page ${currentPage}: Scraped ${jobsOnPage.length} jobs.`);
            currentPage++;
        } catch (error) {
            console.error(`Error scraping Uniting Care jobs on page ${currentPage}: ${error.message}`);
            hasMoreJobs = false;
        }
    }

    return jobListings;
}

// Add similar functions for other sources...

// Main function
async function scrapeAllJobs() {
    console.log("Scraping process started...");
    let allJobListings = [];

    for (const source of TARGET_URLS) {
        const sector = source.url.includes('400c8606503e937687a9f8f39aba8f88') ? 'Aged Care' : 'Disability Support';
        const scrapedJobs = await scrapeUnitingCareJobs(source.url, source.employer, sector);
        allJobListings = allJobListings.concat(scrapedJobs);
    }

    console.log(`Total jobs scraped: ${allJobListings.length}`);
    await updateJobListings(allJobListings);
    console.log("Scraping process complete.");
}

// Run the scraping process
scrapeAllJobs().catch((error) => console.error("Error in scraping:", error));
