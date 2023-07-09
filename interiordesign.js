const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const cors = require('cors');
const https = require('https');
const fs = require("fs");
const path = require("path");
const mysql = require('mysql2');
const md5 = require('md5');
const resizeOptimizeImages = require('resize-optimize-images');
const TelegramBot = require('node-telegram-bot-api');
const token = '5539314736:AAF3rUUSj6XgXsenCQ2bomuQmJ4t38DKGd8';
const bot = new TelegramBot(token, {polling: true});
const pool = mysql.createPool({
    host: 'localhost',
    user: 'polyantseva',
    database: 'design',
    password: 'UsK&sRFOdDk0'
});
const promisePool = pool.promise();
app.use(cors());
app.use(fileUpload({
    limits: {fileSize: 50 * 1024 * 1024},
    tempFileDir: __dirname + '/uploads/'
}));
app.use(express.json());

async function projectGetImages(project_id) {
    let sqlQuery = "SELECT * FROM `projects_images` WHERE `project_id` = '" + project_id + "' ORDER BY `position` ASC";
    const [rows, fields] = await promisePool.query(sqlQuery);
    return rows;
}

async function projectAddImage(project_id, url, resized_url, hard_resized_url) {
    let images = await projectGetImages(project_id);
    let sqlQuery = "INSERT INTO `projects_images` (`project_id`, `position`, `url_original`, `resized_url`, `hard_resized_url`) VALUES ('" + project_id + "', '" + images.length + "', '" + url + "', '" + resized_url + "', '" + hard_resized_url + "')";
    const [rows, fields] = await promisePool.query(sqlQuery);
    return rows;
}

async function ideasAdd(id, url, resized_url, hard_resized_url) {
    let images = await projectGetImages(project_id);
    let sqlQuery = "INSERT INTO `ideas` (`project_id`, `position`, `url_original`, `resized_url`, `hard_resized_url`) VALUES ('" + project_id + "', '" + images.length + "', '" + url + "', '" + resized_url + "', '" + hard_resized_url + "')";
    const [rows, fields] = await promisePool.query(sqlQuery);
    return rows;
}

app.post('/project/:id/edit/images/add', function (req, res) {
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    sampleFile = req.files.inputfile;
    console.log(req.files);
    let newfilename = md5(Date.now()) + '.' + sampleFile.name.split('.')[1];
    uploadPath = '/var/www/html/uploads/' + newfilename;
    sampleFile.mv(uploadPath, async function (err) {
        if (err)
            return res.status(500).send(err);
        await fs.copyFile('/var/www/html/uploads/' + newfilename, '/var/www/html/uploads/resized_' + newfilename, async (err) => {
            if (err) {
                console.log("Error Found:", err);
            } else {
                await resizeOptimizeImages({
                    images: ['/var/www/html/uploads/resized_' + newfilename],
                    width: 1250,
                    quality: 85
                });
            }
        });
        await fs.copyFile('/var/www/html/uploads/' + newfilename, '/var/www/html/uploads/hard_resized_' + newfilename, async (err) => {
            if (err) {
                console.log("Error Found:", err);
            } else {
                await resizeOptimizeImages({
                    images: ['/var/www/html/uploads/hard_resized_' + newfilename],
                    width: 650,
                    quality: 80
                });
            }
        });
        res.send({
            code: 200,
            url: 'https://polyantseva-design.ru/uploads/' + newfilename,
            resized_url: 'https://polyantseva-design.ru/uploads/resized_' + newfilename,
            hard_resized_url: 'https://polyantseva-design.ru/uploads/hard_resized_' + newfilename
        });
        projectAddImage(req.params.id, 'https://polyantseva-design.ru/uploads/' + newfilename,
            'https://polyantseva-design.ru/uploads/resized_' + newfilename,
            'https://polyantseva-design.ru/uploads/hard_resized_' + newfilename);
    });
});

app.get('/project/:id/edit/images/:imageid/delete', async function (req, res) {
    let projectid = req.params.id,
        imageid = req.params.imageid;
    await removeProjectImageDisk(projectid, imageid);
    let sqlQuery = "DELETE FROM `projects_images` WHERE `id` = '" + imageid + "' AND `project_id` = '" + projectid + "'";
    await promisePool.query(sqlQuery);
    res.json({
        code: 200
    });
    res.end();
});

async function removeIdeaImageDisk(ideaid) {
    let sqlQuery = "SELECT * FROM `ideas` WHERE `id` = '" + ideaid + "'";
    const [rows, fields] = await promisePool.query(sqlQuery);
    let files = [];
    files.push(rows[0].url_original);
    files.push(rows[0].url_resized);
    files.push(rows[0].hard_resized_url);

    for (let i = 0; i < files.length; i++) {
        let directiory = files[i].replace('https://polyantseva-design.ru', '/var/www/html');
        fs.stat(directiory, function (error, stat) {
            if (error === null) {
                console.log("Файл найден");
                fs.unlink(directiory, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(`Удален ${directiory}`);
                    }
                })
            } else if (error.code === 'ENOENT') {
                console.log("Файл не найден");
            } else {
                console.log('Some other error: ', error.code);
            }
        });
    }
}

async function removeProjectImageDisk(projectid, imageid) {
    let sqlQuery = "SELECT * FROM `projects_images` WHERE `id` = '" + imageid + "' AND `project_id` = '" + projectid + "'";
    const [rows, fields] = await promisePool.query(sqlQuery);
    let files = [];
    files.push(rows[0].url_original);
    files.push(rows[0].resized_url);
    files.push(rows[0].hard_resized_url);

    for (let i = 0; i < files.length; i++) {
        let directiory = files[i].replace('https://polyantseva-design.ru', '/var/www/html');
        fs.stat(directiory, function (error, stat) {
            if (error === null) {
                console.log("Файл найден");
                fs.unlink(directiory, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(`Удален ${directiory}`);
                    }
                })
            } else if (error.code === 'ENOENT') {
                console.log("Файл не найден");
            } else {
                console.log('Some other error: ', error.code);
            }
        });
    }
}

app.get('/project/:projectid/edit/images/:imageid/move/:action', async function (req, res) {
    let projectid = req.params.projectid,
        action = req.params.action,
        imageid = req.params.imageid;
    console.log(action);
    console.log(imageid);
    let sqlQuery = "SELECT * FROM `projects_images` WHERE `project_id` = '" + projectid + "' ORDER BY `position` ASC";
    console.log(sqlQuery);
    const [rows, fields] = await promisePool.query(sqlQuery);
    console.log(rows);
    for (let i = 0; i < rows.length; i++) {
        console.log(`${rows[i].id} === ${imageid}`);
        if (Number(rows[i].id) === Number(imageid)) {
            console.log('нашел нахуй');
            if (action === "up") {
                console.log('1');
                if (i === 0) return;
                console.log('2');
                sqlQuery = "UPDATE `projects_images` SET `position`='" + rows[i].position + "' WHERE `id` = '" + rows[i - 1].id + "'";
                console.log(sqlQuery);
                await promisePool.query(sqlQuery);
                sqlQuery = "UPDATE `projects_images` SET `position`='" + rows[i - 1].position + "' WHERE `id` = '" + rows[i].id + "'";
                console.log(sqlQuery);
                await promisePool.query(sqlQuery);
            } else if (action === "down") {
                console.log('3');
                if (i === rows.length - 1) return;
                console.log('4');
                sqlQuery = "UPDATE `projects_images` SET `position`='" + rows[i].position + "' WHERE `id` = '" + rows[i + 1].id + "'";
                console.log(sqlQuery);
                await promisePool.query(sqlQuery);
                sqlQuery = "UPDATE `projects_images` SET `position`='" + rows[i + 1].position + "' WHERE `id` = '" + rows[i].id + "'";
                console.log(sqlQuery);
                await promisePool.query(sqlQuery);
            }
        }
    }
    res.json({
        code: 200
    });
    res.end();
});

app.get('/ideas/get/all', async function (req, res) {
    let sqlQuery = "SELECT * FROM `ideas` ORDER BY `id` DESC";
    const [rows, fields] = await promisePool.query(sqlQuery);
    res.json({
        code: 200,
        data: rows
    });
    res.end();
});

app.get('/ideas/:id/delete', async function (req, res) {
    let id = req.params.id;
    await removeIdeaImageDisk(id);
    let sqlQuery = "DELETE FROM `ideas` WHERE `id` = '" + id + "'";
    await promisePool.query(sqlQuery);
    res.json({
        code: 200
    });
    res.end();
});

app.get('/ideas/get/:id', async function (req, res) {
    let id = req.params.id;
    let sqlQuery = "SELECT * FROM `ideas` WHERE `id` = '" + id + "' ORDER BY `id` DESC";
    let [rows, fields] = await promisePool.query(sqlQuery);
    res.json({
        code: 200,
        data: {
            idea: rows[0]
        }
    });
    res.end();
});

app.post('/ideas/:id/edit', async function (req, res) {
    let id = req.params.id,
        description = req.body.ideaDescription
    console.log(req.body);
    let sqlQuery = "UPDATE `ideas` SET `description` = '" + description + "' WHERE `id` = '" + id + "'";
    console.log(sqlQuery);
    await promisePool.query(sqlQuery);
    res.json({
        code: 200
    });
    res.end();
});

app.post('/ideas/create', function (req, res) {
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    sampleFile = req.files.inputfile;
    console.log(req.files);
    let newfilename = md5(Date.now()) + '.' + sampleFile.name.split('.')[1];
    uploadPath = '/var/www/html/uploads/' + newfilename;
    sampleFile.mv(uploadPath, async function (err) {
        if (err)
            return res.status(500).send(err);
        await fs.copyFile('/var/www/html/uploads/' + newfilename, '/var/www/html/uploads/resized_' + newfilename, async (err) => {
            if (err) {
                console.log("Error Found:", err);
            } else {
                await resizeOptimizeImages({
                    images: ['/var/www/html/uploads/resized_' + newfilename],
                    width: 1250,
                    quality: 85
                });
            }
        });
        await fs.copyFile('/var/www/html/uploads/' + newfilename, '/var/www/html/uploads/hard_resized_' + newfilename, async (err) => {
            if (err) {
                console.log("Error Found:", err);
            } else {
                await resizeOptimizeImages({
                    images: ['/var/www/html/uploads/hard_resized_' + newfilename],
                    width: 650,
                    quality: 80
                });
            }
        });
        let sqlQuery = "INSERT INTO `ideas` (`id`, `description`, `url_original`, `url_resized`, `hard_resized_url`) VALUES (NULL, '', '" + 'https://polyantseva-design.ru/uploads/' + newfilename + "','" + 'https://polyantseva-design.ru/uploads/resized_' + newfilename + "','" + 'https://polyantseva-design.ru/uploads/hard_resized_' + newfilename + "')";
        let [rows, fields] = await promisePool.query(sqlQuery);
        res.json({
            code: 200,
            id: rows.insertId
        });
        res.end();
    });
});

app.get('/project/get/all', async function (req, res) {
    let sqlQuery = "SELECT * FROM `projects` ORDER BY `id` DESC";
    const [channelRows, channelFields] = await promisePool.query(sqlQuery);
    let response = [];
    for (let i = 0; i < channelRows.length; i++) {
        let images = await projectGetImages(channelRows[i].id);
        response.push({
            project: channelRows[i],
            images: images
        });
    }
    res.json({
        code: 200,
        data: response
    });
    res.end();
});

app.get('/project/create', async function (req, res) {
    let sqlQuery = "INSERT INTO `projects` (`id`, `name`, `description`) VALUES (NULL, 'Без названия', 'Будущее описание');";
    let [rows, fields] = await promisePool.query(sqlQuery);
    res.json({
        code: 200,
        id: rows.insertId
    });
    res.end();
});

app.get('/project/:projectid/delete', async function (req, res) {
    let projectid = req.params.projectid;
    let images = await projectGetImages(projectid);
    for (let i = 0; i < images.length; i++) {
        let imageid = images[i].id;
        await removeProjectImageDisk(projectid, imageid);
    }
    let sqlQuery = "DELETE FROM `projects` WHERE `id` = '" + projectid + "'";
    await promisePool.query(sqlQuery);
    res.json({
        code: 200
    });
    res.end();
});

app.get('/project/get/:id', async function (req, res) {
    let id = req.params.id;
    let images = await projectGetImages(id);
    //SELECT * FROM `projects` WHERE `id` != '23'
    let sqlQuery = "SELECT * FROM `projects` WHERE `id` = '" + id + "' ORDER BY `id` DESC";
    let [dataRows, dataFields] = await promisePool.query(sqlQuery);
    sqlQuery = "SELECT * FROM `projects` WHERE `id` != '" + id + "' ORDER BY `id` DESC";
    let [projectsRows, projectsFields] = await promisePool.query(sqlQuery);
    let projects = [];
    for (let i = 0; i < projectsRows.length; i++) {
        projects.push({
            project: projectsRows[i],
            images: await projectGetImages(projectsRows[i].id)
        });
    }
    res.json({
        code: 200,
        data: {
            project: dataRows[0],
            images: images
        },
        projects: projects
    });
    res.end();
});

app.post('/project/:id/edit', async function (req, res) {
    let id = req.params.id,
        name = req.body.projectName,
        description = req.body.projectDescription
    console.log(req.body);
    let sqlQuery = "UPDATE `projects` SET `name`='" + name + "',`description`='" + description + "' WHERE `id` = '" + id + "'";
    await promisePool.query(sqlQuery);
    res.json({
        code: 200
    });
    res.end();
});

app.post('/lead', async function (req, res) {
    console.log(req.body);
    lead(req.body.name, req.body.phone, req.body.comment, req.body.form, req.body.messenger);
    res.json({
        code: 200,
        lead: req.body
    });
    res.end();
});

const sslServer = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'cert', 'privkey.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
}, app);

function lead(name = undefined, phone = undefined, comment = undefined, form = undefined, messenger = undefined) {
    let text = `<b>Новая заявка (${form}):</b>`;
    if (name !== undefined)
        if (name.length > 0)
            text += `\n<b>Имя:</b> ${name}`;
    if (phone !== undefined)
        if (phone.length > 0)
            text += `\n<b>Телефон:</b> ${phone}`;
    if (messenger !== undefined)
        if (messenger.length > 0)
            text += `\n<b>Способ связи:</b> ${messenger}`;
    if (comment !== undefined)
        if (comment.length > 0)
            text += `\n<b>Комментарий:</b> ${comment}`;
    bot.sendMessage(-654650882, text, {
        parse_mode: "HTML"
    });
}

sslServer.listen('5100', () => {
    console.log('API.JS работает! СУКААААААААААА!');
});