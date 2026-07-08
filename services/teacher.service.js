import User from "../models/user.model.js";



export const createTeacherService = async (teacherData) => {
    const existingTeacher = await User.findOne({ email: teacherData.email, });
    if (existingTeacher) {
        throw new Error("Teacher with this email already exists");
    }

const teacher = await User.create({
  ...teacherData,
  role: "teacher",
  isActive: true,
  status: "active",
});
    return teacher;
}

export const getAllTeacherService =async () => {
    const teacher = await User.find({
        role:"teacher",
    }).select("-password");

    return teacher;
}

export const getTeacherByIdService =async (teacherId) => {
    const teacher =await User.findOne({
        _id:teacherId,
        role:"teacher",
    }).select("-password");

    if(!teacher){
        throw new Error("Teacher not found");
    }

    return teacher;
}

export const updateTeacherStatusService = async (
    teacherId,
    status
) => {
    const teacher = await User.findOneAndUpdate(
        {
            _id:teacherId,
            role:"teacher",
        },
        {
            status,
        },
        {new :true,}
    ).select("-password");

    if(!teacher){
        throw new Error ("Teacher not found");
    }

    return teacher;
}
