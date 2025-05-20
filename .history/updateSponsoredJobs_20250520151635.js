const categories = ['Top Job', 'Featured Job', 'Urgent Job', 'Popular Job'];

  function getRandomCategory() {
    return categories[Math.floor(Math.random() * categories.length)];
  }

// updateSponsoredJobs.js
const fs = require('fs');
const csvParser = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// File paths (adjust as needed)
const JOB_LISTINGS_PATH = 'C:\\Users\\Maca\\Documents\\find-care-jobs-mvp\\scrape\\job_listings.csv';
const SPONSORED_JOBS_PATH = 'C:\\Users\\Maca\\Documents\\find-care-jobs-mvp\\scrape\\sponsored_jobs.csv';

// Helper: Read CSV file and return array of objects
function loadCsv(filePath) {
  const rows = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        // Normalize keys: make sure Category, Sponsored, etc. are consistent
        const normalizedRow = {
          ID: row.ID,
          scrapeDate: row.scrapeDate || row.ScrapeDate,
          Sponsored: row.Sponsored || row.sponsored,
          Category: row.Category || row.category,
          sponsorDate: row.sponsorDate || row.SponsorshipStartDate || ''
        };
        rows.push(normalizedRow);
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}


// Helper: Write data to CSV
function writeCsv(filePath, header, data) {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: header,
  });
  return csvWriter.writeRecords(data);
}

// Check if a given date (YYYY-MM-DD) is older than 30 days
function isOlderThan30Days(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  return (now - date) > (30 * 24 * 60 * 60 * 1000);
}

// Function to update sponsored jobs based on job listings and current sponsored jobs.
// desiredCount is the number of sponsored jobs you wish to maintain.
function updateSponsoredJobs(jobListings, sponsoredJobs, desiredCount = 100) {
  // Create a set of valid job IDs from job listings
  const jobIds = new Set(jobListings.map(job => job.ID));

// new: filter out old/expired, then “fix” any bad Category entries
  let updatedSponsored = sponsoredJobs
    .filter(job => !isOlderThan30Days(job.scrapeDate) && jobIds.has(job.ID))
    .map(job => {
      // if job.Category is already one of our valid labels, keep it,
      // otherwise assign a fresh randomCategory right here
      const cat = categories.includes(job.Category)
        ? job.Category.trim()
        : getRandomCategory();

      return {
        ...job,
        Sponsored: 'true',    // keep the sponsored‐flag
        Category: cat,        // now guaranteed to be a real label
        // leave job.scrapeDate as-is for existing rows
      };
    });

  // Gather IDs already in the updated list
  const currentSponsoredIds = new Set(updatedSponsored.map(job => job.ID));
  // Filter job listings to those not already sponsored
  const availableJobs = jobListings.filter(job => !currentSponsoredIds.has(job.ID));

  // Shuffle availableJobs (simple Fisher-Yates shuffle)
  for (let i = availableJobs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableJobs[i], availableJobs[j]] = [availableJobs[j], availableJobs[i]];
  }

  

  // If we don't have enough sponsored jobs, add new ones from available jobs
  while (updatedSponsored.length < desiredCount && availableJobs.length > 0) {
    const job = availableJobs.pop();
    const randomCategory = getRandomCategory();
    console.log(`Assigning category: ${randomCategory} for job: ${job.jobTitle}`);
    console.log(job);
    updatedSponsored.push({
      ...job,
      Sponsored: 'true',
      Category: randomCategory,
      scrapeDate: new Date().toISOString().split('T')[0],
      sponsorDate: new Date().toISOString().split('T')[0]
    });
  }

  return updatedSponsored;
}

async function main() {
  try {
    // Load job listings and current sponsored jobs
    const jobListings = await loadCsv(JOB_LISTINGS_PATH);
    const sponsoredJobs = await loadCsv(SPONSORED_JOBS_PATH);

    // Update sponsored jobs (here, we desire to maintain 100 sponsored jobs)
    const updatedSponsoredJobs = updateSponsoredJobs(jobListings, sponsoredJobs, 100);

    // Define CSV header format (make sure it matches your CSV column names)
    const header = [
      { id: 'ID', title: 'ID' },
      { id: 'scrapeDate', title: 'scrapeDate' },
      { id: 'Sponsored', title: 'Sponsored' },
      { id: 'Category', title: 'Category' },
      { id: 'sponsorDate', title: 'sponsorDate' }
    ];

    // Write the updated sponsored jobs back to the CSV file
    await writeCsv(SPONSORED_JOBS_PATH, header, updatedSponsoredJobs);
    console.log('Sponsored jobs CSV updated successfully.');
  } catch (error) {
    console.error('Error updating sponsored jobs:', error);
  }
}

main();
