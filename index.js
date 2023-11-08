import fs from 'fs';
import path from 'path';
import {
  JSDOM
} from 'jsdom';
import {
  DateTime
} from 'luxon';
import inquirer from 'inquirer';
import he from 'he';
import {
  writeFileSync
} from 'fs';
import {
  createEvents
} from 'ics';
const defaultEmailsDir = './emails';
const defaultIcsDir = './ics';

const validateDirectoryExists = async (dir, type) => {
  while (!fs.existsSync(dir)) {
    console.log(`The directory does not exist: ${dir}`);
    const answers = await inquirer.prompt([{
      type: 'input',
      name: 'directory',
      message: `Please enter a valid ${type} directory:`,
      default: type === 'emails' ? defaultEmailsDir : defaultIcsDir,
    }]);
    dir = answers.directory;
  }
  return dir;
};

const getDirectory = async (message, defaultDir) => {
  const {
    directory
  } = await inquirer.prompt([{
    type: 'input',
    name: 'directory',
    message: message,
    default: defaultDir,
  }]);
  return await validateDirectoryExists(directory, message.toLowerCase().includes('email') ? 'emails' : 'ics');
};

const readEmailFiles = (dir) => fs.readdirSync(dir)
  .filter(file => /\.(html|htm)$/i.test(file))
  .map(file => ({
    name: file,
    content: fs.readFileSync(path.join(dir, file), 'utf-8')
  }));

const extractBookingDetails = (htmlContent, fileName) => {
  const decodedContent = he.decode(htmlContent).replace(/\r?\n|\r/g, ' ');
  const dom = new JSDOM(decodedContent);
  const document = dom.window.document;
  const bodyText = document.querySelector('body').textContent.replace(/\s+/g, ' ');

  const bookingNameRegex = /QA Booking Confirmation for (.*?) Start Date:/;
  const bookingReferenceNumberRegex = /reference number is (\d+)/;

  let bookingNameMatch = bookingNameRegex.exec(bodyText);
  let bookingReferenceNumberMatch = bookingReferenceNumberRegex.exec(bodyText);

  let bookingName = bookingNameMatch ? bookingNameMatch[1] : `Unknown Booking Name (${fileName})`;
  let bookingReferenceNumber = bookingReferenceNumberMatch ? bookingReferenceNumberMatch[1] : "Unknown Reference Number";

  // Use regular expression to match the pattern of date and duration
  const bookingDetailsRegex = /(\d{2} \w+ \d{4} at \d{2}:\d{2}).+?(\d+(?:\.\d+)?) day/g;
  let bookingDetailsMatches;
  let bookingDatesWithDuration = [];

  while ((bookingDetailsMatches = bookingDetailsRegex.exec(bodyText)) !== null) {
    const dateText = bookingDetailsMatches[1];
    const start = DateTime.fromFormat(dateText, 'dd MMMM yyyy \'at\' HH:mm', {
      zone: 'utc'
    });
    if (!start.isValid) {
      console.error(`Invalid date format for '${dateText}' in file '${fileName}'`);
      continue;
    }

    // Define end time based on start time
    let end;
    if (start.hour === 9 && start.minute === 30) {
      end = start.set({
        hour: 12,
        minute: 30
      });
    } else if (start.hour === 13 && start.minute === 30) {
      end = start.set({
        hour: 16,
        minute: 30
      });
    } else {
      console.error(`Unexpected start time '${start.toFormat('HH:mm')}' in file '${fileName}'.`);
      continue;
    }

    bookingDatesWithDuration.push({
      booking_start: start.toISO(),
      booking_end: end.toISO()
    });
  }

  return {
    booking_name: bookingName,
    booking_reference_number: bookingReferenceNumber,
    booking_dates: bookingDatesWithDuration
  };
};

const createICSFile = (bookingDetails, directory, busyStatus) => {
  const {
    booking_name,
    booking_reference_number,
    booking_dates
  } = bookingDetails;

  const events = booking_dates.map(({
    booking_start,
    booking_end
  }) => {
    const startDt = DateTime.fromISO(booking_start, {
      zone: 'utc'
    });
    const endDt = DateTime.fromISO(booking_end, {
      zone: 'utc'
    });

    return {
      start: [startDt.year, startDt.month, startDt.day, startDt.hour, startDt.minute],
      end: [endDt.year, endDt.month, endDt.day, endDt.hour, endDt.minute],
      title: `${booking_name}`,
      description: `Booking Reference Number: ${booking_reference_number}`,
      status: 'CONFIRMED',
      busyStatus: busyStatus,
      productId: 'qa-booking-confirmation-processor'
    };
  });

  createEvents(events, (error, value) => {
    if (error) {
      console.error(error);
      return;
    }

    const filename = `${booking_name.replace(/\s+/g, '_')}.ics`;
    const filePath = path.join(directory, filename);
    fs.writeFileSync(filePath, value);
    console.log(`ICS file created: ${filePath}`);
  });
};

const processFiles = async () => {
  const emailsDir = await getDirectory('Enter the directory where your email files are located (default: ./emails):', defaultEmailsDir);
  const files = readEmailFiles(emailsDir);

  if (files.length === 0) {
    console.log('No HTML files found in the specified directory.');
    return;
  }

  const {
    busyStatus
  } = await inquirer.prompt([{
    type: 'list',
    name: 'busyStatus',
    message: 'Choose the busy status for the ICS files (default: Out Of Office):',
    choices: ['FREE', 'TENTATIVE', 'BUSY', 'OOF'],
    default: 'OOF'
  }]);

  const bookingDetailsArray = files.map(file => extractBookingDetails(file.content, file.name));

  console.log(JSON.stringify(bookingDetailsArray))

  const {
    createICS
  } = await inquirer.prompt([{
    type: 'confirm',
    name: 'createICS',
    message: 'Do you want to create ICS files for the bookings? (default: y)',
    default: true
  }]);

  if (createICS) {
    const {
      icsDir
    } = await inquirer.prompt([{
      type: 'input',
      name: 'icsDir',
      message: 'Confirm the directory where ICS files will be saved (default: ./ics):',
      default: () => 'ics'
    }]);

    if (!fs.existsSync(icsDir)) {
      fs.mkdirSync(icsDir);
      console.log(`Directory created: ${icsDir}`);
    }

    bookingDetailsArray.forEach((bookingDetails) => {
      console.log(bookingDetails)
      createICSFile(bookingDetails, icsDir, busyStatus);
    });
  } else {
    console.log('Exiting without creating ICS files.');
  }
};

processFiles();