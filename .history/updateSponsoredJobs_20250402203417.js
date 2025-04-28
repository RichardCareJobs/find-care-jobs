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
      .on('data', (row) => rows.push(row))
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

  // Remove sponsored jobs that are older than 30 days or no longer in job listings
  let updatedSponsored = sponsoredJobs.filter(job => {
    return !isOlderThan30Days(job.scrapeDate) && jobIds.has(job.ID);
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

  const categories = ['Top Job', 'Featured Job', 'Urgent Job', 'Popular Job'];

function getRandomCategory() {
  return categories[Math.floor(Math.random() * categories.length)];
}


// If we don't have enough sponsored jobs, add new ones from available jobs
while (updatedSponsored.length < desiredCount && availableJobs.length > 100) {
  const job = availableJobs.pop();
  updatedSponsored.push({
    ...job,
    Sponsored: 'true',
    Category: getRandomCategory(),  // Assign a random category here
    scrapeDate: new Date().toISOString().split('T')[0]
  });
}

return updatedSponsored;

}

async function main() {
  try {
    // Load job listings and current sponsored jobs
    const jobListings = await loadCsv(JOB_LISTINGS_PATH);
    const sponsoredJobs = await loadCsv(SPONSORED_JOBS_PATH);

    // Update sponsored jobs (here, we desire to maintain 10 sponsored jobs)
    const updatedSponsoredJobs = updateSponsoredJobs(jobListings, sponsoredJobs, 100);

    // Define CSV header format (make sure it matches your CSV column names)
    const header = [
      { id: 'ID', title: 'ID' },
      { id: 'scrapeDate', title: 'scrapeDate' },
      { id: 'Sponsored', title: 'Sponsored' },
      { id: 'Category', title: 'Category' }
    ];

    // Write the updated sponsored jobs back to the CSV file
    await writeCsv(SPONSORED_JOBS_PATH, header, updatedSponsoredJobs);
    console.log('Sponsored jobs CSV updated successfully.');
  } catch (error) {
    console.error('Error updating sponsored jobs:', error);
  }
}

main();
