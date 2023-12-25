import mongoose from "mongoose";

export const getSingleUser =  (userId)=> {
  return  [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
        $addFields: {
          followers: {$size: "$followers"}
        },
       
    },
    {
      $addFields: {
        following: {$size: "$following"}
      }
       
    },
    {
      $addFields: {
        posts: {$size: "$posts"}
      } 
    },
   
    {
      $project: {
        username: 1,
        isAdmin: 1,
        isPrivate: 1,
        name: 1,
        profilePicture: 1,
        followers:1,
        following:1,
        posts:1,
        isActive: 1,
      }
    }
  ]
}
export const getSingleUserByUsername =  (username)=> {
  return  [
    {
      $match: {
        username: username,
      },
    },
    {
        $addFields: {
          followers: {$size: "$followers"}
        },
       
    },
    {
      $addFields: {
        following: {$size: "$following"}
      }
       
    },
    {
      $addFields: {
        posts: {$size: "$posts"}
      } 
    },
   
    {
      $project: {
        username: 1,
        isAdmin: 1,
        isPrivate: 1,
        name: 1,
        profilePicture: 1,
        followers:1,
        following:1,
        posts:1,
        isActive: 1,
      }
    }
  ]
}


// [
//   {
//     $match:
//       /**
//        * query: The query in MQL.
//        */
//       {
//         username: "xisherwoodr",
//       },
//   },
//   {
//     $project:
//       /**
//        * specifications: The fields to
//        *   include or exclude.
//        */
//       {
//         followers: 1,
//         _id: 0,
//       },
//   },
//   {
//     $unwind: {
//       path: "$followers",
//     },
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "followers",
//       foreignField: "_id",
//       as: "follower",
//     },
//   },
//   {
//     $addFields:
//       /**
//        * newField: The new field name.
//        * expression: The new field expression.
//        */
//       {
//         follower: {
//           $first: "$follower",
//         },
//       },
//   },
//   {
//     $replaceRoot:
//       /**
//        * replacementDocument: A document or string.
//        */
//       {
//         newRoot: "$follower",
//       },
//   },
//   {
//     $project: {
//       _id: 1,
//       username: 1,
//       profilePicture: 1,
//     },
//   },
//   {
//     $addFields:
//       /**
//        * newField: The new field name.
//        * expression: The new field expression.
//        */
//       {
//         isFollow: {
//           $eq: ["hbingley1", "$username"],
//         },
//       },
//   },
// ]