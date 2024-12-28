const express = require('express');
const brain = require('brain.js');
const fs = require('fs'); // Thêm module fs
const csv = require('csv-parser');
const multer = require('multer'); // Thêm multer
const upload = multer({ dest: 'uploads/' }); // Thư mục lưu file upload
// const data = require('./data.json'); // Dữ liệu huấn luyện

const app = express();
const port = 3000;

// Serve static files from the "public" directory
app.use(express.static('public'));

// Middleware để parse dữ liệu JSON từ request body
app.use(express.json());

// Endpoint để phân loại
let net;
let modelLoaded = false;
let data = [];

function loadModel() {
    net = new brain.recurrent.LSTM();
    try {
        const modelData = require('./model.json');
        net.fromJSON(modelData);
        modelLoaded = true;
        console.log("Mô hình đã được tải");
    } catch (error) {
        console.log("Không tìm thấy mô hình đã lưu, đang tiến hành training...");
        modelLoaded = false;
        trainModel()
    }
}

function trainModel() {
    try {
        data = require('./converted_data.json');
    } catch (error) {
        return res.status(500).json({ error: 'converted_data.json is not exist!' });
    }
    const trainingData = data.map(item => ({
        input: item.review.toLowerCase().replace(/[^a-zA-Z\s]/g, ""),
        output: item.sentiment
    }));
    net.train(trainingData, {
        iterations: 500,
        log: true,
        logPeriod: 100,
        errorThresh: 0.011,
        learningRate: 0.01
    });
    const model = net.toJSON();
    fs.writeFileSync('model.json', JSON.stringify(model));
    modelLoaded = true;
    console.log("Đã train xong mô hình và lưu vào model.json");
}

app.post('/analyze', (req, res) => {
    if (!modelLoaded) {
        return res.status(500).json({ error: 'Model is not loaded yet.' });
    }
    const review = req.body.review;
    const processedReview = review.toLowerCase().replace(/[^a-zA-Z\s]/g, "");

    if (!processedReview) {
        return res.status(400).json({ error: 'Review text is required.' });
    }

    const result = net.run(processedReview);
    console.log(result);
    let sentiment;
    if (result.positive > 0.6) {
        sentiment = "positive"
    } else if (result.negative > 0.6) {
        sentiment = "negative"
    } else {
        sentiment = "neutral"
    }

    res.json({ sentiment: sentiment, scores: result });
});

// Endpoint để huấn luyện
app.post('/train', (req, res) => {
    trainModel();
    res.json({ message: 'Training completed!' });
});

// Endpoint để convert CSV sang JSON
app.post('/convert', upload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            // Lưu file JSON
            const jsonFilePath = 'converted_data.json'; // Bạn có thể thay đổi tên file
            fs.writeFileSync(jsonFilePath, JSON.stringify(results, null, 2));

            // Xóa file CSV tạm
            fs.unlinkSync(req.file.path);

            res.json({ success: true, message: 'CSV converted to JSON and saved as converted_data.json' });
        })
        .on('error', (error) => {
            // Xóa file CSV tạm
            fs.unlinkSync(req.file.path);
            res.status(500).json({ success: false, error: error.message });
        });
});

loadModel();
// Khởi động server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});