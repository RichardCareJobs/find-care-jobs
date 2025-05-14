const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const csvParser = require('csv-parser');
const crypto = require('crypto');

// Helper function to build a paginated URL.
// It removes any existing "page" parameter and then sets it (along with any extra parameters).
function buildPaginatedUrl(url, page, extraParams = {}) {
  const parsedUrl = new URL(url);
  parsedUrl.searchParams.delete('page');
  parsedUrl.searchParams.set('page', page);
  for (const key in extraParams) {
    parsedUrl.searchParams.set(key, extraParams[key]);
  }
  return parsedUrl.toString();
}

const TARGET_URLS = [
    { url: 'https://globalaus242.dayforcehcm.com/CandidatePortal/en-AU/unitingaunsw/Site/UNITINGCCS', employer: 'Uniting Care - Aged Care' },
    { url: 'https://careers.uniting.org/jobs/search?page=1&query=&category_uids[]=5b6fd8bdee29e4a5be4b41a9abb42451', employer: 'Uniting Care - Disability Support' },
    { url: 'https://careers.hammond.com.au/jobs/search?page=1&query=', employer: 'Hammond Care' },
    { url: 'https://careers.whiddon.com.au/en/listing/', employer: 'Whiddon' },
    { url: 'https://careers.lwb.org.au/en/listing/', employer: 'Life Without Barriers' },
    { url: 'https://careers.lifestylesolutions.org.au/jobs/search', employer: 'Lifestyle Solutions' },
    { url: 'https://globalaus242.dayforcehcm.com/CandidatePortal/en-AU/opalhealthcare', employer: 'Opal Healthcare' },
    { url: 'https://careers.baptistcare.org.au/jobs/search', employer: 'Baptist Care' }
];

// Paths for CSV files
const jobsCsvPath = './scrape/job_listings.csv';
const sponsorshipCsvPath = './scrape/sponsored_jobs.csv';

// Set up CSV writer (for job_listings.csv)
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

// Set up CSV writer for sponsored_jobs.csv
const sponsorshipCsvWriter = createCsvWriter({
  path: sponsorshipCsvPath,
  header: [
    { id: 'id',         title: 'ID' },
    { id: 'scrapeDate', title: 'scrapeDate' },
    { id: 'sponsored',  title: 'Sponsored' },
    { id: 'category',   title: 'Category' }
  ]
});

// Function to generate a unique job ID
function generateJobId(job) {
    const url = job.jobURL?.trim() || 'unknown-url';
    const employer = job.employer?.trim() || 'unknown-employer';
    return crypto.createHash('md5').update(`${url}-${employer}`).digest('hex');
}

// Function to clean and validate job data
function cleanJobData(job) {
    const cleanedJob = {
        id: generateJobId(job),
        jobTitle: job.jobTitle?.trim() || 'Not specified',
        location: job.location?.trim() || 'Not specified',
        sector: job.sector?.trim() || 'Not specified',
        jobType: job.jobType?.trim() || 'Not specified',
        closingDate: job.closingDate?.trim() || 'Not specified',
        jobURL: job.jobURL?.trim() || 'Not specified',
        employer: job.employer?.trim() || 'Not specified',
        scrapeDate: job.scrapeDate || new Date().toISOString().split('T')[0],
    };

    // Log a warning if critical fields are missing
    if (cleanedJob.jobTitle === 'Not specified' || cleanedJob.jobURL === 'Not specified') {
        console.warn(`Incomplete job data detected: ${JSON.stringify(cleanedJob)}`);
    }

    return cleanedJob;
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

// --------------------
// Scraping functions
// --------------------

// Uniting Care - Aged Care

async function scrapeUnitingCareAgedCare(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        // Build the URL with the current page
        const paginatedUrl = buildPaginatedUrl(url, currentPage);
        try {
            // Fetch the page
            const response = await axios.get(paginatedUrl, {
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
                }
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // New Dayforce-style selector
            const jobsOnPage = $('.search-result');
            if (jobsOnPage.length === 0) {
                hasMoreJobs = false;
                break;
            }

            jobsOnPage.each((index, element) => {
                // Grab title from the link inside .posting-title
                const jobTitle = $(element).find('.posting-title a').text().trim() || 'Not specified';
                
                // Build absolute URL from the link’s href
                const jobPath = $(element).find('.posting-title a').attr('href');
                const jobURL = jobPath ? new URL(jobPath, url).href : 'Not specified';

                // The location is typically in .posting-subtitle
                const location = $(element).find('.posting-subtitle').text().trim() || 'Not specified';
                
                // If there's no actual closing date on the page, default to 'Not specified'
                const closingDate = 'Not specified';

                const jobData = {
                    jobTitle,
                    location,
                    jobType: 'Not specified',
                    sector: 'Aged Care',  // or 'Disability Support', depending on which Uniting link
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
            console.error(`Error scraping Uniting (Dayforce) on page ${currentPage}:`, error.message);
            hasMoreJobs = false;
        }
    }

    return jobListings;
}


// Uniting Care - Disability Support


async function scrapeUnitingCareDisabilitySupport(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const paginatedUrl = buildPaginatedUrl(url, currentPage);
        const response = await axios.get(paginatedUrl);
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

// Hammond Care


async function scrapeHammondCareJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const paginatedUrl = buildPaginatedUrl(url, currentPage);
        const response = await axios.get(paginatedUrl);
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

// Whiddon
async function scrapeWhiddonJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const paginatedUrl = buildPaginatedUrl(url, currentPage);
        const response = await axios.get(paginatedUrl);
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

// Life Without Barriers
async function scrapeLifeWithoutBarriersJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        // Here we add the extra parameter "page-items" along with "page"
        const paginatedUrl = buildPaginatedUrl(url, currentPage, { "page-items": "20" });
        const response = await axios.get(paginatedUrl);
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

// Lifestyle Solutions
async function scrapeLifestyleSolutionsJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        const paginatedUrl = buildPaginatedUrl(url, currentPage);
        const response = await axios.get(paginatedUrl);
        const html = response.data;
        const $ = cheerio.load(html);

        const jobsOnPage = $('.job-search-results-card');
        if (jobsOnPage.length === 0) {
            hasMoreJobs = false;
            break;
        }

        jobsOnPage.each((index, element) => {
            const jobTitle = $(element).find('.card-title.job-search-results-card-title a').text().trim();
            const jobPath = $(element).find('.card-title.job-search-results-card-title a').attr('href');
            // Use URL constructor to combine the base and path
            const jobURL = jobPath ? new URL(jobPath, url).href : 'Not specified';
            const location = $(element).find('.job-component-list.job-component-list-location').text().trim();
            const jobType = $(element).find('.job-component-list.job-component-list-employment_type').text().trim();

            const jobData = {
                jobTitle,
                location,
                sector: 'Disability Support',
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

// Opal Healthcare
async function scrapeOpalHealthcareJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    let hasMoreJobs = true;
    const scrapeDate = new Date().toISOString().split('T')[0];

    while (hasMoreJobs) {
        // Use buildPaginatedUrl to set the page parameter
        const paginatedUrl = buildPaginatedUrl(url, currentPage);
        try {
            const response = await axios.get(paginatedUrl, {
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
                }
            });

            console.log(`Final URL after redirects: ${response.request.res.responseUrl}`);
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
                // Use the provided URL as the base so the correct domain is used
                const jobURL = jobPath ? new URL(jobPath, url).href : 'Not specified';
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
            hasMoreJobs = false;
        }
    }
    return jobListings;
}

// Baptist Care
async function scrapeBaptistCareJobs(url, employer) {
    let jobListings = [];
    let currentPage = 1;
    const scrapeDate = new Date().toISOString().split('T')[0];
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        console.log(`Scraping Baptist Care on page ${currentPage}...`);
        const paginatedUrl = buildPaginatedUrl(url, currentPage);
        try {
            const response = await axios.get(paginatedUrl);
            const html = response.data;
            const $ = cheerio.load(html);

            const jobsOnPage = $('.job-search-results-card');
            if (jobsOnPage.length === 0) {
                console.log(`No jobs found on page ${currentPage}. Stopping scrape.`);
                hasMoreJobs = false;
                break;
            } else {
                jobsOnPage.each((index, element) => {
                    const jobTitle = $(element).find('.card-title.job-search-results-card-title').text().trim();
                    const jobPath = $(element).find('.card-title.job-search-results-card-title a').attr('href');
                    // Append the jobPath to the base URL correctly.
                    const jobURL = jobPath ? 'https://careers.baptistcare.org.au' + jobPath : 'Not specified';
                    const location = $(element).find('.job-component-list-location').text().trim() || 'Not specified';
                    const jobType = $(element).find('.job-component-list-employment_type').text().trim() || 'Not specified';

                    const jobData = {
                        jobTitle,
                        location,
                        sector: 'Aged Care',
                        jobType,
                        jobURL,
                        employer,
                        sponsored: 'false',
                        category: '',
                        scrapeDate,
                    };

                    jobListings.push(jobData);
                });
                console.log(`Scraped ${jobsOnPage.length} jobs on page ${currentPage}.`);
                currentPage++;
            }
        } catch (error) {
            console.error(`Error scraping Baptist Care on page ${currentPage}:`, error.message);
            hasMoreJobs = false;
        }
    }
    console.log(`Total jobs scraped from Baptist Care: ${jobListings.length}`);
    return jobListings;
}

// --------------------
// Main function
// --------------------
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

        // 1) Write final jobs to job_listings.csv
   await writeJobsToCsv(finalJobs, jobsCsvPath);
   console.log(`Wrote ${finalJobs.length} rows to ${jobsCsvPath}`);

   // 2) Build and write sponsored_jobs.csv
   
 // only include rows where scraped job.sponsored === 'true'
const sponsorshipRecords = finalJobs
  .filter(job => String(job.sponsored).toLowerCase() === 'true')
  .map(job => ({
    id:         job.id,
    scrapeDate: job.scrapeDate,
    sponsored:  job.sponsored,
    category:   job.category
  }));

   await sponsorshipCsvWriter.writeRecords(sponsorshipRecords);
   console.log(`Wrote ${sponsorshipRecords.length} rows to ${sponsorshipCsvPath}`);

   console.log('Job & sponsorship CSV update completed.');

    } catch (error) {
        console.error('Error during scraping:', error);
    }
})();
