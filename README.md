# QA Booking Confirmation Processor
Tool to convert QA Training Booking Confirmation emails into Calendar Invites/ICS files

<p align="center">
    <img src="https://i.imgur.com/pmdTecd.png" width="80%" height="auto" />
</p>

# Why does this exist?
- QA Higher Education started utilising a new booking system for courses, but it does not provide an ability to provide calendar invites to the courses, this is a horrific admin task for each student who has to create these invites to stay on time for each course.
- Emails are sent with Booking Confirmations, which details each date with start time for each of the attendances required throughout a course/module.
- Booking Confirmation emails (as of 8th November 2023) are sent from ``QAADegreeAdmin@qa.com``, and start with ``QA Booking Confirmation for`` in the subject line.

# How to use
- Node.js is required, LTS is recommended and can be installed from https://nodejs.org/en/download.
- Clone the repository, run ``npm install`` and then ``npm run start`` in the top level of the application.

# Features
- Configurable email input folder, and ics/calendar invites file output folder. Sensible defaults are created if not existing by default, and no folder is given by the user.
- Supports multiple emails input as once (HTML only).
- Supports a single ICS/calendar invite with multiple course dates/times to mass-import into your favourite calendar application.

# Works best with
- Outlook for 365 (open the Booking Confirmation email w/ a double-click, then go to File > Save As > Choose Type 'HTML') - then simply open the generated ICS files in Outlook to import them.