const router = require("express").Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Category = require("../models/Category");

// get post using username
router.get("/user/:username", async (req, res) => {
  try {
    const posts = await Post.find({ username: req.params.username });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json(err);
  }
});

//CREATE POST
router.post("/", async (req, res) => {
  try {
    const { categories } = req.body;

    // ✅ Save categories if new
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        await Category.findOneAndUpdate(
          { name: cat },
          { name: cat },
          { upsert: true, new: true }
        );
      }
    }

    const newPost = new Post(req.body);
    const savedPost = await newPost.save();

    res.status(200).json(savedPost);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});
// LIKE / UNLIKE
router.put("/:id/like", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.body.userId;

    if (post.likes.includes(userId)) {
      // ❌ UNLIKE
      post.likes.pull(userId);
    } else {
      // 👍 LIKE
      post.likes.push(userId);
      post.dislikes.pull(userId); // remove dislike if exists
    }

    await post.save();

    res.status(200).json({
      likes: post.likes.length,
      dislikes: post.dislikes.length,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

// DISLIKE / REMOVE DISLIKE
router.put("/:id/dislike", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.body.userId;

    if (post.dislikes.includes(userId)) {
      // ❌ REMOVE DISLIKE
      post.dislikes.pull(userId);
    } else {
      // 👎 DISLIKE
      post.dislikes.push(userId);
      post.likes.pull(userId); // remove like if exists
    }

    await post.save();

    res.status(200).json({
      likes: post.likes.length,
      dislikes: post.dislikes.length,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});


// router.put("/:id/reaction/remove", async (req, res) => {
//   try {
//     const post = await Post.findById(req.params.id);
//     const userId = req.body.userId;

//     post.likes.pull(userId);
//     post.dislikes.pull(userId);
//     await post.save();

//     res.status(200).json({
//       likes: post.likes.length,
//       dislikes: post.dislikes.length,
//     });
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });

router.delete("/:id/comment/:commentId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.id(req.params.commentId);

    if (comment.userId.toString() !== req.body.userId) {
      return res.status(403).json("You can delete only your comment");
    }

    comment.remove();
    await post.save();
    res.status(200).json(post.comments);
  } catch (err) {
    res.status(500).json(err);
  }
});

// comment
router.post("/:id/comment", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    post.comments.push({
      userId: req.body.userId,
      text: req.body.text,
    });

    await post.save();
    res.status(200).json(post.comments);
  } catch (err) {
    res.status(500).json(err);
  }
});


//UPDATE POST
// UPDATE POST (SAFE)
router.put("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json("Post not found");
    }

    // 🔐 Only owner can update
    if (post.username !== req.body.username) {
      return res.status(401).json("You can update only your post!");
    }

    const { title, desc, photo, categories } = req.body;

    // ✅ Save categories if new
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        await Category.findOneAndUpdate(
          { name: cat },
          { name: cat },
          { upsert: true, new: true }
        );
      }
    }

    // ✅ Only allowed fields update
    post.title = title ?? post.title;
    post.desc = desc ?? post.desc;
    post.photo = photo ?? post.photo;
    post.categories = categories ?? post.categories;

    const updatedPost = await post.save();
    res.status(200).json(updatedPost);

  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});



//DELETE POST
router.delete("/:id", async (req, res) => {
  try {
    const deletePost = await Post.findById(req.params.id);
    if (!deletePost) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (deletePost.username === req.body.username) {
      try {
        await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({message: "Post has been deleted..."});
      } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error deleting the post", error: err });
      }
    } else {
      res.status(401).json({message: "You can delete only your post!"});
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error finding the post", error: err });
  }
});

//GET POST
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.status(200).json(post);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//GET ALL POSTS
router.get("/", async (req, res) => {
  const username = req.query.user;
  const catName = req.query.cat;
  try {
    let posts;
    if (username) {
      posts = await Post.find({ username });
    } else if (catName) {
      posts = await Post.find({
        categories: {
          $in: [catName],
        },
      });
    } else {
      posts = await Post.find();
    }
    res.status(200).json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;