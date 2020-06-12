const Usuario = require('../models/Usuario')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: 'variables.env' })
const Proyecto = require('../models/Proyecto')
const Tarea = require('../models/Tarea')

//Crea y firma un JWT
const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email } = usuario

  return jwt.sign({ id, email }, secreta, { expiresIn })
}

const resolvers = {
  Query: {
    obtenerProyectos: async (_, { }, ctx) => {
      const proyectos = await Proyecto.find({ creador: ctx.usuario.id })

      return proyectos
    },
    obtenerTareas: async (_, { input }, ctx) => {
      const tareas = await Tarea.find({ creador: ctx.usuario.id }).where('proyecto').equals(input.proyecto)

      return tareas
    }
  },
  Mutation: {
    crearUsuario: async (_, { input }) => {
      const { email, password } = input

      const existeUsuario = await Usuario.findOne({ email })

      //Si existe el usuario
      if (existeUsuario) {
        throw new Error('El usuario ya está registrado')
      }

      try {
        //Hashear password
        const salt = await bcryptjs.genSalt(10)
        input.password = await bcryptjs.hash(password, salt)

        //Registrar nuevo usuario
        const nuevoUsuario = new Usuario(input)
        nuevoUsuario.save()

        return "Usuario creado correctamente"
      }
      catch (error) {
        console.log(error)
      }
    },
    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input

      //Si el usuario existe
      const existeUsuario = await Usuario.findOne({ email })

      if (!existeUsuario) {
        throw new Error('El usuario no existe')
      }

      //Si el password es correcto
      const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password)

      if (!passwordCorrecto) {
        throw new Error('Password Incorrecto')
      }

      //Permitir acceso a la app
      return {
        token: crearToken(existeUsuario, process.env.SECRETA, '2hr')
      }
    },
    nuevoProyecto: async (_, { input }, ctx) => {

      try {
        const proyecto = Proyecto(input)

        //Asociar el creador
        proyecto.creador = ctx.usuario.id

        //Almacenarlo en la DB
        const resultado = await proyecto.save()

        return resultado
      }
      catch (error) {
        console.log(error)
      }
    },
    actualizarProyecto: async (_, { id, input }, ctx) => {
      //Revisar si el proyecto existe
      let proyecto = await Proyecto.findById(id)
      if (!proyecto) {
        throw new Error('Proyecto no encontrado')
      }

      //Revisar que la persona que lo quiere editar es creador
      if (proyecto.creador.toString() !== ctx.usuario.id) {
        throw new Error('No tienes las credenciales para editar')
      }

      //Guardar proyecto
      proyecto = await Proyecto.findByIdAndUpdate({ _id: id }, input, { new: true })

      return proyecto
    },
    eliminarProyecto: async (_, { id }, ctx) => {
      //Revisar si el proyecto existe
      let proyecto = await Proyecto.findById(id)
      if (!proyecto) {
        throw new Error('Proyecto no encontrado')
      }

      //Revisar que la persona que lo quiere eliminar es creador
      if (proyecto.creador.toString() !== ctx.usuario.id) {
        throw new Error('No tienes las credenciales para eliminar')
      }

      //Eliminar proyecto
      await Proyecto.findOneAndDelete({ _id: id })

      return `Proyecto eliminado`
    },
    nuevaTarea: async (_, { input }, ctx) => {
      try {
        const tarea = new Tarea(input)
        tarea.creador = ctx.usuario.id
        const resultado = await tarea.save()

        return resultado
      }
      catch (error) {
        console.log(error)
      }
    },
    actualizarTarea: async (_, { id, input, estado }, ctx) => {
      //Tarea existe
      let tarea = await Tarea.findById(id)

      if (!tarea) {
        throw new Error('Tarea no encontrada')
      }

      //Si la persona que edita es el creador
      if (tarea.creador.toString() !== ctx.usuario.id) {
        throw new Error('No tienes las credenciale para editar')
      }

      //Asignar estado
      input.estado = estado

      //Guardar y retonar tarea
      tarea = await Tarea.findOneAndUpdate({ _id: id }, input, { new: true })

      return tarea
    },
    eliminarTarea: async (_, { id }, ctx) => {
      //Tarea existe
      let tarea = await Tarea.findById(id)

      if (!tarea) {
        throw new Error('Tarea no encontrada')
      }

      //Si la persona que elimina es el creador
      if (tarea.creador.toString() !== ctx.usuario.id) {
        throw new Error('No tienes las credenciale para eliminar')
      }

      //Eliminar
      await Tarea.findOneAndDelete({_id: id})

      return `Tarea Eliminada`
    }
  }
}

module.exports = resolvers