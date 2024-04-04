const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const fileUpload = require('express-fileupload');

const app = express()
const port = 3000

// middleware
app.use(cors())
// req.body undefined solve
app.use(express.json())
app.use(fileUpload());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lph1gnd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const database = client.db('F23-3DoctorsPortal');
        const appointmentOptionCollection = database.collection('appointmentOptions');
        const bookingsCollection = database.collection('Bookings');
        const usersCollection = database.collection('Users');
        const doctorsCollection = database.collection('Doctors');

        // chages
        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            const query = {};
            // pura appointmentOptionCollection ke load korlam jeta ekta array of object
            const options = await appointmentOptionCollection.find(query).toArray();
            // fornend query paramitter diye send kora date ke diye arekta query toiri koreci
            const bookingQuery = { appointmentDate: date }
            // somosto bookings / alredy booked theke amader select kora date onjai  khuje ante hbe
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray()
            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name)
                const optionSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !optionSlots.includes(slot))
                option.slots = remainingSlots;
            })
            res.send(options)

        })


        app.get('/appointmentSpecialty', async (req, res) => {
            const query = {};
            const result = await appointmentOptionCollection.find(query).project({ name: 1 }).toArray()
            res.send(result)
        })





        // bookings post
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment,
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You have already booked ${booking.appointmentDate}. Please try another Day`;
                return res.send({ acknowledged: false, message })
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result)
        })

        // get bookings
        app.get('/bookings', async (req, res) => {
            const frontEmail = req.query.email;
            const query = { email: frontEmail };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result)
        })

        // users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })
        // is the user admin or not
        app.get('/users/admin/:email', async (req, res) => {
            const frontEmail = req.params.email;
            const query = { email: frontEmail }
            const user = await usersCollection.findOne(query);

            res.send({ isAdmin: user?.role === 'admin' })
        })

        app.get('/users', async (req, res) => {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const searchDeleteId = { _id: new ObjectId(id) }
            const deletedUser = await usersCollection.deleteOne(searchDeleteId);
            res.send(deletedUser)

        })

        app.put('/users/admin/:id', async (req, res) => {
            const frontId = req.params.id;
            const filter = { _id: new ObjectId(frontId) }
            const option = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result)
        })



        // doctots
        app.post('/doctors', async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;
            const specialty = req.body.specialty;
            const pic = req.files.image;
            const picData = pic.data
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const doctor = {
                name,
                email,
                specialty,
                image: imageBuffer
            }
            const result = await doctorsCollection.insertOne(doctor);
            res.send(result)
        })


        app.get('/doctors', async (req, res) => {
            const query = {};
            const result = await doctorsCollection.find(query).toArray();
            res.send(result)
        })

        app.delete('/doctors/:id', async (req, res) => {
            const id = req.params.id;
            const searchDeleteId = { _id: new ObjectId(id) }
            const deletedDoctor = await doctorsCollection.deleteOne(searchDeleteId);
            res.send(deletedDoctor)

        })


    } finally {
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Hello Doctors Portal')
})

app.listen(port, () => {
    console.log(`Our portal website run on: ${port}`)
})