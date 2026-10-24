# mshmolla.github.io

Personal academic website of **Md. Sabbir Hossain Molla**, live at <https://mshmolla.github.io>.
It is built with plain HTML, CSS and a little JavaScript. There are no frameworks or build tools.

## Folder structure

```
mshmolla.github.io/
├── index.html          ← Home page
├── projects.html       ← Projects page
├── experience.html     ← Experience page
├── education.html      ← Education page
├── css/style.css       ← The look: colours, fonts, layout
├── js/main.js          ← Phone menu and the "missing image" helper
├── images/             ← Your pictures
│   ├── profile.jpg
│   ├── projects/  awards/  logos/
└── documents/          ← Your PDFs (CVs)
```

## Placeholder checklist (upload these with EXACTLY these names)

| # | File to upload | Page | What it should be |
|---|---|---|---|
| 1 | `images/profile.jpg` | Home | Your profile photo (square works best) |
| 2 | `documents/academic-cv.pdf` | Home | Your Academic CV (PDF) |
| 3 | `documents/europass-cv.pdf` | Home | Your Europass CV (PDF) |
| 4 | `images/projects/solardt.jpg` | Home | SolarDT project picture (wide, about 16:9) |
| 5 | `images/projects/violence-detection.jpg` | Home | Violence Detection project picture (wide) |
| 6 | `images/awards/mist-robotics-club.jpg` | Home | Certificate picture: MIST Robotics Club |
| 7 | `images/awards/ieee-mist-sb.jpg` | Home | Certificate picture: IEEE MIST SB |
| 8 | `images/awards/face-the-case-2.jpg` | Home | Certificate picture: Face the Case 2.0 |
| 9 | `images/awards/compas-2025.jpg` | Home | Certificate picture: COMPAS 2025 |
| 10 | `images/awards/qpain-2026.jpg` | Home | Certificate picture: QPAIN 2026 |
| 11 | `images/awards/caretutors.jpg` | Home | Certificate picture: CareTutors |
| 12 | `images/awards/bohubrihi.jpg` | Home | Certificate picture: Bohubrihi |
| 13 | `images/awards/vd-ultra-2026.jpg` | Home | Certificate picture: VD Ultra 2026 |
| 14 | `images/projects/solardt-banner.jpg` | Projects | Wide banner picture of the SolarDT project |
| 15 | `images/logos/mist.png` | Experience + Education | MIST logo (used on both pages) |
| 16 | `images/logos/rpcl.png` | Experience | Rural Power Company Limited logo |
| 17 | `images/logos/mist-robotics-club.png` | Experience | MIST Robotics Club logo |
| 18 | `images/logos/ieee-mist-sb.png` | Experience | IEEE MIST Student Branch logo |
| 19 | `images/logos/caretutors.png` | Experience | CARETUTORS logo |
| 20 | `images/logos/iceeict.png` | Experience | ICEEICT conference logo |
| 21 | `images/logos/adamjee-cantonment-college.png` | Education | Adamjee Cantonment College logo |
| 22 | `images/logos/badda-alatunnesa.png` | Education | Badda Alatunnesa High School logo |

Until a file is uploaded, the site shows a grey striped box saying "Add image: …" in its place.

## Quick editing tips

- **Change text:** open the page's `.html` file on GitHub, click the ✏️ pencil, edit the words between the tags, then click **Commit changes**.
- **Change colours or fonts:** edit only section 1 at the top of `css/style.css`.
- **Add a publication:** in `projects.html`, copy one whole `<article class="card"> … </article>` block and paste it below. Then change the title, the links, the year and the abstract.
- **Change contact details or social links:** the footer is repeated on all 4 pages, so change it in all 4 files.
