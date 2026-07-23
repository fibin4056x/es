import ClassModel from "../models/class.model.js";
import DivisionModel from "../models/division.model.js";

const normalizeClassPayload = (
  classData = {}
) => ({
  name: classData.name?.trim(),
  academicYear:
    classData.academicYear?.trim(),
  status:
    classData.status === "inactive"
      ? "inactive"
      : "active",
});

export const createClassService =
  async (classData) => {
    const normalizedClassData =
      normalizeClassPayload(classData);

    const existingClass =
      await ClassModel.findOne({
        name: normalizedClassData.name,
        academicYear:
          normalizedClassData.academicYear,
      });

    if (existingClass) {
      throw new Error(
        "Class already exists for this academic year"
      );
    }

    return await ClassModel.create(
      normalizedClassData
    );
  };

export const getAllClassesService =
  async () => {
    return await ClassModel.find().sort({
      academicYear: -1,
      name: 1,
      createdAt: -1,
    });
  };

export const getClassByIdService =
  async (classId) => {
    const singleClass =
      await ClassModel.findById(classId);

    if (!singleClass) {
      throw new Error("Class not found");
    }

    return singleClass;
  };

export const updateClassService =
  async (classId, updateData) => {
    const normalizedUpdateData =
      normalizeClassPayload(updateData);

    const duplicateClass =
      await ClassModel.findOne({
        _id: { $ne: classId },
        name: normalizedUpdateData.name,
        academicYear:
          normalizedUpdateData.academicYear,
      });

    if (duplicateClass) {
      throw new Error(
        "Class already exists for this academic year"
      );
    }

    const updatedClass =
      await ClassModel.findByIdAndUpdate(
        classId,
        normalizedUpdateData,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedClass) {
      throw new Error("Class not found");
    }

    return updatedClass;
  };

export const deleteClassService =
  async (classId) => {
   //check if class exists 

   const classData = await  ClassModel.findById(classId);

   if(!classData){
    throw new Error("Class not found");
   }

   //check if any division  belongs to  this  class 

   const hasDivision =await DivisionModel.exists({
    classId,
   })

   if(hasDivision){
    throw  Error(
      "Cannot delete  class because  division are assigned to it "
    );
  }
  //safe to delete 
  await ClassModel.findByIdAndDelete(classId);

   return {

    message:"Class deleted successfully",
   };
  };

  