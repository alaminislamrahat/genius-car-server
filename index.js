const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// middle ware 

app.use(cors({
  origin: ['https://genius-car-349b7.firebaseapp.com',
    'https://genius-car-349b7.web.app',
    
    
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3jkraio.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




// middale ware 

const logged = async (req, res, next) => {
  console.log('called : ', req.method, req.url);
  next()
}


const varifyToken = async(req,res,next) => {
  const token = req.cookies.token
  // console.log('token in middle ware',token);

  if(!token){
    return res.status(401).send({message : 'unauthorize access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message : 'unauthorize access'})
    }
    req.user = decoded;
    next();
  })

 
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const serviceCollection = client.db('geniusCar').collection('services');
    const bookingCollection = client.db('geniusCar').collection('booking');


    // auth related api 

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      // console.log('token for user', user);
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn : '1h'});
      res
      .cookie('token',token,{
        httpOnly : true,
        secure : true,
        sameSite : 'none'
      })
      .send({success : true});
    })

    app.post('/logout', async (req,res)=>{
      const user = req.body;
      console.log('logged out',user)
      res.clearCookie('token',{maxAge : 0}).send({success : true})
    })


    // service related api 
    app.get('/services', logged, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    });

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        // Sort matched documents in descending order by rating

        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, service_id: 1, price: 1, img: 1 },
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result)
    })

    // booking 
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    })

    app.get('/bookings',logged,varifyToken, async (req, res) => {
      console.log(req.query.email);
    
      console.log('token owner',req.user);
      if(req.user.email !== req.query.email){
        return res.status(403).send({message : 'access forbidden'})
      }
      

      let query = {};
      console.log('tok tok', req.cookies.token)
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })


    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result)
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      // console.log(updatedBooking);

      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('genius is running')
});

app.listen(port, () => {
  console.log(`this is runnit on port : ${port}`)
})